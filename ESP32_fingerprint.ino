#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>
#include <ArduinoJson.h>
#include "time.h"   // For real-time clock

// === WiFi credentials ===
const char* ssid = "joyboy";
const char* password = "12345678";

// === Backend URLs ===
const char* employeesURL = "http://192.168.137.206/backend/employees.php";
const char* attendanceURL = "http://192.168.137.206/backend/attendance.php";

// === Fingerprint sensor on ESP32 ===
HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// State variables
int lastID = -1;   
bool idSent = false;
bool enrollmentMode = false;
String pendingEmployeeName = "";
String pendingEmployeeRoll = "";
String pendingEmployeeKey = "";  // Save original employee key
int pendingEmployeeID = -1;

// Timing variables for monitoring
unsigned long lastMonitorTime = 0;
const unsigned long MONITOR_INTERVAL = 30000; // Check every 30 seconds

// === Function: Get attendance status ===
String getAttendanceStatus() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("⚠ Failed to get time");
    return "Unknown";
  }
  int hour = timeinfo.tm_hour;
  int minute = timeinfo.tm_min;
  if ((hour == 9 && minute >= 30) || (hour > 9 && hour < 13) || (hour == 13 && minute == 0)) {
    return "Morning Present";
  }
  if (hour >= 14 && hour < 18) {
    return "Afternoon Present";
  }
  return "Out of Attendance Time";
}

// === Function: Find next available fingerprint slot (1-127) ===
int findNextAvailableSlot() {
  Serial.println("🔍 Searching for available fingerprint slot...");
  
  for (int id = 1; id <= 127; id++) {
    if (finger.loadModel(id) != FINGERPRINT_OK) {
      Serial.println("✅ Found available slot: " + String(id));
      return id;
    }
  }
  
  Serial.println("❌ No available slots found!");
  return -1;
}

// === Function: Monitor backend for new employees ===
bool checkForPendingEnrollments() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot check for pending enrollments");
    return false;
  }
  
  HTTPClient http;
  String url = String(employeesURL) + "?pending";
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Parse JSON to find employees without fingerprint enrollment
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      JsonArray employees = doc.as<JsonArray>();
      
      if (employees.size() > 0) {
        // Get the first employee with pending enrollment
        JsonObject empData = employees[0];
        String empName = empData["name"] | "Unknown";
        String empRoll = empData["rollno"] | "NA";
        
        Serial.println("🆕 NEW EMPLOYEE DETECTED!");
        Serial.println("👤 Name: " + empName);
        Serial.println("🎓 Roll No: " + empRoll);
        Serial.println("📝 Status: Fingerprint not enrolled");
        Serial.println("=======================================");
        
        // Set enrollment mode
        enrollmentMode = true;
        pendingEmployeeName = empName;
        pendingEmployeeRoll = empRoll;
        pendingEmployeeKey = empRoll;  // Use roll number as key for enrollment
        pendingEmployeeID = findNextAvailableSlot();
        
        if (pendingEmployeeID > 0) {
          Serial.println("🔔 ENROLLMENT MODE ACTIVATED!");
          Serial.println("👋 Please place finger for: " + empName);
          Serial.println("🆔 Will be assigned Fingerprint ID: " + String(pendingEmployeeID));
          Serial.println("=======================================");
          return true;
        } else {
          Serial.println("❌ No available fingerprint slots!");
          enrollmentMode = false;
          return false;
        }
      } else {
        Serial.println("✅ No pending enrollments found");
        return false;
      }
    } else {
      Serial.println("❌ Failed to parse JSON response");
      return false;
    }
  } else {
    Serial.println("❌ Failed to check for pending enrollments. HTTP code: " + String(httpCode));
    return false;
  }
  
  http.end();
  return false;
}

// === Function: Enroll new fingerprint ===
bool enrollFingerprint(int id) {
  Serial.println("🚀 Starting fingerprint enrollment for ID: " + String(id));
  Serial.println("👤 Employee: " + pendingEmployeeName);
  
  int maxAttempts = 3;
  int attempt = 0;
  
  // Step 1: Get first image
  while (attempt < maxAttempts) {
    Serial.println("📷 Place finger on sensor... (Attempt " + String(attempt + 1) + ")");
    int p = -1;
    while (p != FINGERPRINT_OK) {
      p = finger.getImage();
      switch (p) {
        case FINGERPRINT_OK:
          Serial.println("✅ Image taken");
          break;
        case FINGERPRINT_NOFINGER:
          Serial.print(".");
          delay(100);
          break;
        case FINGERPRINT_PACKETRECIEVEERR:
          Serial.println("❌ Communication error");
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        case FINGERPRINT_IMAGEFAIL:
          Serial.println("❌ Imaging error");
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        default:
          Serial.println("❌ Unknown error");
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
      }
    }
    
    // Convert image to template
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
      Serial.println("❌ Could not convert image");
      attempt++;
      continue;
    }
    
    Serial.println("🔄 Remove finger");
    delay(2000);
    p = 0;
    while (p != FINGERPRINT_NOFINGER) {
      p = finger.getImage();
    }
    
    // Step 2: Get second image
    Serial.println("📷 Place same finger again...");
    p = -1;
    while (p != FINGERPRINT_OK) {
      p = finger.getImage();
      switch (p) {
        case FINGERPRINT_OK:
          Serial.println("✅ Image taken");
          break;
        case FINGERPRINT_NOFINGER:
          Serial.print(".");
          delay(100);
          break;
        case FINGERPRINT_PACKETRECIEVEERR:
          Serial.println("❌ Communication error");
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        case FINGERPRINT_IMAGEFAIL:
          Serial.println("❌ Imaging error");
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        default:
          Serial.println("❌ Unknown error");
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
      }
    }
    
    // Convert second image to template
    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
      Serial.println("❌ Could not convert second image");
      attempt++;
      continue;
    }
    
    // Create model
    p = finger.createModel();
    if (p == FINGERPRINT_OK) {
      Serial.println("✅ Prints matched!");
      
      // Store model
      p = finger.storeModel(id);
      if (p == FINGERPRINT_OK) {
        Serial.println("🎉 FINGERPRINT ENROLLED SUCCESSFULLY!");
        Serial.println("🆔 Stored at ID: " + String(id));
        return true;
      } else {
        Serial.println("❌ Could not store model");
        attempt++;
        continue;
      }
    } else {
      Serial.println("❌ Fingerprints did not match");
      attempt++;
      continue;
    }
  }
  
  Serial.println("❌ Enrollment failed after " + String(maxAttempts) + " attempts");
  return false;
}

// === Function: Update backend after successful enrollment ===
bool updateBackendEnrollment(int fingerprintID) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot update backend");
    return false;
  }
  
  HTTPClient http;
  String url = String(employeesURL) + "?enroll";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON with enrollment data
  String jsonData = "{\"rollno\":\"" + pendingEmployeeRoll + "\",\"fingerprintId\":\"" + String(fingerprintID) + "\"}";
  
  int httpResponseCode = http.PUT(jsonData);
  if (httpResponseCode > 0) {
    Serial.println("✅ Backend updated with enrollment status");
    Serial.println("📊 Response code: " + String(httpResponseCode));
    http.end();
    return true;
  } else {
    Serial.println("❌ Failed to update backend. HTTP code: " + String(httpResponseCode));
    http.end();
    return false;
  }
}

// === Function: Save attendance to backend ===
bool saveAttendance(int fingerprintID) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot save attendance");
    return false;
  }
  
  HTTPClient http;
  http.begin(attendanceURL);
  http.addHeader("Content-Type", "application/json");

  // Get current time in "HH:MM:SS" format as required by PHP
  struct tm timeinfo;
  char timeString[9]; // "HH:MM:SS" + null terminator
  if (getLocalTime(&timeinfo)) {
    strftime(timeString, sizeof(timeString), "%H:%M:%S", &timeinfo);
  } else {
    strcpy(timeString, "00:00:00"); // fallback
  }

  // Prepare JSON data with only required fields
  String jsonData = "{\"finger_id\":\"" + String(fingerprintID) + 
                    "\",\"scan_time\":\"" + String(timeString) + "\"}";

  int httpResponseCode = http.POST(jsonData);
  if (httpResponseCode > 0) {
    Serial.println("✅ Attendance saved to backend");
    Serial.println("📊 Response code: " + String(httpResponseCode));
    String response = http.getString();
    Serial.println("📥 Response: " + response);
    http.end();
    return true;
  } else {
    Serial.println("❌ Failed to save attendance: " + String(httpResponseCode));
    http.end();
    return false;
  }
}

// === Function: Get employee details by fingerprint ID ===
bool getEmployeeDetails(int fingerprintID, String &name, String &rollno) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot fetch employee details");
    return false;
  }
  
  HTTPClient http;
  String url = String(employeesURL) + "/" + String(fingerprintID);
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("📥 Backend Response: " + payload);
    
    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      name = doc["name"] | "Unknown";
      rollno = doc["rollno"] | "NA";
      http.end();
      return true;
    } else {
      Serial.println("❌ JSON Parse failed");
      http.end();
      return false;
    }
  } else {
    Serial.println("❌ Backend request failed: " + String(httpCode));
    http.end();
    return false;
  }
}

// === Function to get fingerprint ID ===
int getFingerprintID() {
  int p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;
  
  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;
  
  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    if (!enrollmentMode) { // Only log during normal operation
      Serial.print("👤 Attendance scan - ID: ");
      Serial.println(finger.fingerID);
    }
    return finger.fingerID;
  } else {
    if (!enrollmentMode) { // Only log during normal operation
      Serial.println("❌ No match found");
    }
    return -1;
  }
}

// === Function: Handle normal attendance operation ===
void handleNormalOperation() {
  int id = getFingerprintID();
  if (id != -1) {
    if (id != lastID) {
      lastID = id;
      idSent = false;
    }
    
    if (!idSent) {
      String name = "Unknown";
      String rollno = "NA";
      
      // Fetch employee details from backend by fingerprint ID
      if (getEmployeeDetails(id, name, rollno)) {
        String status = getAttendanceStatus(); // For logging only
        Serial.println("✅ Attendance recorded: " + name + " (" + rollno + ")");
        Serial.println("📊 Status: " + status);
        
        // Save to backend attendance.php - now only requires fingerprint ID and scan time
        if (saveAttendance(id)) {
          Serial.println("✅ Attendance successfully recorded");
        } else {
          Serial.println("❌ Failed to record attendance");
        }
      } else {
        Serial.println("❌ Failed to fetch employee details");
      }
      
      idSent = true;
    }
  } else {
    lastID = -1;
    idSent = false;
  }
}

// === Function: Handle enrollment operation ===
void handleEnrollmentOperation() {
  Serial.println("👋 Enrollment mode active. Place finger for: " + pendingEmployeeName);
  
  if (enrollFingerprint(pendingEmployeeID)) {
    // Enrollment successful
    if (updateBackendEnrollment(pendingEmployeeID)) {
      Serial.println("🎉 ENROLLMENT COMPLETED FOR: " + pendingEmployeeName);
      Serial.println("🆔 Fingerprint ID: " + String(pendingEmployeeID));
      
      // Reset enrollment mode
      enrollmentMode = false;
      pendingEmployeeName = "";
      pendingEmployeeRoll = "";
      pendingEmployeeKey = "";
      pendingEmployeeID = -1;
      
      Serial.println("🔄 Returning to normal operation...");
    } else {
      Serial.println("❌ Failed to update backend with enrollment data");
    }
  } else {
    Serial.println("❌ Enrollment failed. Will retry in 5 seconds...");
    delay(5000);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("🚀 Starting Enhanced Fingerprint Attendance System");
  Serial.println("================================================");
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("🌐 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.println("📡 IP Address: " + WiFi.localIP().toString());
  
  // Configure time
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("⏳ Waiting for time sync...");
  delay(2000);
  
  // Initialize fingerprint sensor
  mySerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);
  
  if (finger.verifyPassword()) {
    Serial.println("✅ Fingerprint sensor detected!");
    
    // Get sensor parameters
    finger.getParameters();
    Serial.println("📊 Sensor Info:");
    Serial.println("   Template Count: " + String(finger.templateCount));
    Serial.println("   Library Size: " + String(finger.capacity));
  } else {
    Serial.println("❌ Sensor not found!");
    while (1) delay(10);
  }
  
  Serial.println("🔄 System ready! Monitoring for new employees...");
  Serial.println("================================================");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Monitor for new employees periodically (only when not in enrollment mode)
  if (currentTime - lastMonitorTime >= MONITOR_INTERVAL && !enrollmentMode) {
    lastMonitorTime = currentTime;
    if (checkForPendingEnrollments()) {
      // If a pending enrollment is found, the system will enter enrollment mode
      // No need to do anything else here
    }
  }
  
  // Handle different modes
  if (enrollmentMode) {
    handleEnrollmentOperation();
  } else {
    handleNormalOperation();
  }
  
  delay(1000); // Small delay to prevent excessive looping
}