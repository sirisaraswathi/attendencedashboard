#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>
#include <ArduinoJson.h>
#include "time.h"   // For real-time clock
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// === OLED Display Settings ===
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1 // Reset pin not used
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// === WiFi credentials ===
const char* ssid = "joyboy";
const char* password = "12345678";

// === Backend URLs ===
const char* employeesURL = "http:///backend/employees.php";
const char* attendanceURL = "http://192.168.137.252/backend/attendance.php";

// === Fingerprint sensor on ESP32 ===
HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// State variables
int lastID = -1;   
bool idSent = false;
bool enrollmentMode = false;
String pendingEmployeeName = "";
String pendingEmployeeRoll = "";
int pendingEmployeeID = -1;

// Timing variables for monitoring
unsigned long lastMonitorTime = 0;
const unsigned long MONITOR_INTERVAL = 15000; // Check every 15 seconds
unsigned long lastDisplayTime = 0;
const unsigned long DISPLAY_INTERVAL = 10000; // Update display every 10 seconds when idle

// === Function: Display message on OLED with delay ===
void displayMessage(String line1, String line2 = "", String line3 = "", String line4 = "", int delayMs = 2000) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  
  display.println(line1);
  if (line2 != "") display.println(line2);
  if (line3 != "") display.println(line3);
  if (line4 != "") display.println(line4);
  
  display.display();
  lastDisplayTime = millis(); // Update last display time
  
  // Add delay to keep message visible
  if (delayMs > 0) {
    delay(delayMs);
  }
}

// === Function: Get attendance status ===
String getAttendanceStatus() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("⚠ Failed to get time");
    displayMessage("Time Error!", "", "", "", 1500);
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
  displayMessage("Searching for", "available slot...", "", "", 1000);
  
  for (int id = 1; id <= 127; id++) {
    if (finger.loadModel(id) != FINGERPRINT_OK) {
      Serial.println("✅ Found available slot: " + String(id));
      displayMessage("Found slot:", String(id), "", "", 1500);
      return id;
    }
  }
  
  Serial.println("❌ No available slots found!");
  displayMessage("No slots", "available!", "", "", 2000);
  return -1;
}

// === Function: Monitor backend for new employees ===
bool checkForPendingEnrollments() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot check for pending enrollments");
    displayMessage("WiFi not", "connected!", "", "", 2000);
    return false;
  }
  
  HTTPClient http;
  String url = String(employeesURL) + "?pending";
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("📥 Pending enrollments response: " + payload);
    
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
        String empId = empData["id"] | "-1";
        
        Serial.println("🆕 NEW EMPLOYEE DETECTED!");
        Serial.println("👤 Name: " + empName);
        Serial.println("🎓 Roll No: " + empRoll);
        Serial.println("🆔 DB ID: " + empId);
        Serial.println("📝 Status: Fingerprint not enrolled");
        Serial.println("=======================================");
        displayMessage("New Employee:", empName, "Roll: " + empRoll, "Enroll finger!", 3000);
        
        // Set enrollment mode
        enrollmentMode = true;
        pendingEmployeeName = empName;
        pendingEmployeeRoll = empRoll;
        pendingEmployeeID = findNextAvailableSlot();
        
        if (pendingEmployeeID > 0) {
          Serial.println("🔔 ENROLLMENT MODE ACTIVATED!");
          Serial.println("👋 Please place finger for: " + empName);
          Serial.println("🆔 Will be assigned Fingerprint ID: " + String(pendingEmployeeID));
          Serial.println("=======================================");
          displayMessage("ENROLLMENT MODE", "Place finger for:", empName, "ID: " + String(pendingEmployeeID), 3000);
          return true;
        } else {
          Serial.println("❌ No available fingerprint slots!");
          displayMessage("No fingerprint", "slots available!", "", "", 2000);
          enrollmentMode = false;
          return false;
        }
      } else {
        Serial.println("✅ No pending enrollments found");
        displayMessage("System", "working", "", "", 1000); // Shorter delay for this message
        return false;
      }
    } else {
      Serial.println("❌ Failed to parse JSON response");
      Serial.println("📄 Error: " + String(error.c_str()));
      displayMessage("JSON parse", "error!", "", "", 2000);
      return false;
    }
  } else {
    Serial.println("❌ Failed to check for pending enrollments. HTTP code: " + String(httpCode));
    displayMessage("Check failed:", "HTTP " + String(httpCode), "", "", 2000);
    return false;
  }
  
  http.end();
  return false;
}

// === Function: Enroll new fingerprint ===
bool enrollFingerprint(int id) {
  Serial.println("🚀 Starting fingerprint enrollment for ID: " + String(id));
  Serial.println("👤 Employee: " + pendingEmployeeName);
  displayMessage("Enrolling:", pendingEmployeeName, "ID: " + String(id), "", 2000);
  
  int maxAttempts = 3;
  int attempt = 0;
  
  // Step 1: Get first image
  while (attempt < maxAttempts) {
    Serial.println("📷 Place finger on sensor... (Attempt " + String(attempt + 1) + ")");
    displayMessage("Place finger", "Attempt " + String(attempt + 1) + "/" + String(maxAttempts), "", "", 1000);
    
    int p = -1;
    while (p != FINGERPRINT_OK) {
      p = finger.getImage();
      switch (p) {
        case FINGERPRINT_OK:
          Serial.println("✅ Image taken");
          displayMessage("Image taken!", "", "", "", 1000);
          break;
        case FINGERPRINT_NOFINGER:
          Serial.print(".");
          delay(100);
          break;
        case FINGERPRINT_PACKETRECIEVEERR:
          Serial.println("❌ Communication error");
          displayMessage("Comm error!", "", "", "", 1500);
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        case FINGERPRINT_IMAGEFAIL:
          Serial.println("❌ Imaging error");
          displayMessage("Image error!", "", "", "", 1500);
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        default:
          Serial.println("❌ Unknown error");
          displayMessage("Unknown error!", "", "", "", 1500);
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
      }
    }
    
    // Convert image to template
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
      Serial.println("❌ Could not convert image");
      displayMessage("Convert error!", "", "", "", 1500);
      attempt++;
      continue;
    }
    
    Serial.println("🔄 Remove finger");
    displayMessage("Remove finger", "", "", "", 1500);
    delay(2000);
    p = 0;
    while (p != FINGERPRINT_NOFINGER) {
      p = finger.getImage();
    }
    
    // Step 2: Get second image
    Serial.println("📷 Place same finger again...");
    displayMessage("Place same", "finger again", "", "", 1500);
    
    p = -1;
    while (p != FINGERPRINT_OK) {
      p = finger.getImage();
      switch (p) {
        case FINGERPRINT_OK:
          Serial.println("✅ Image taken");
          displayMessage("Image taken!", "", "", "", 1000);
          break;
        case FINGERPRINT_NOFINGER:
          Serial.print(".");
          delay(100);
          break;
        case FINGERPRINT_PACKETRECIEVEERR:
          Serial.println("❌ Communication error");
          displayMessage("Comm error!", "", "", "", 1500);
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        case FINGERPRINT_IMAGEFAIL:
          Serial.println("❌ Imaging error");
          displayMessage("Image error!", "", "", "", 1500);
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
        default:
          Serial.println("❌ Unknown error");
          displayMessage("Unknown error!", "", "", "", 1500);
          attempt++;
          if (attempt >= maxAttempts) return false;
          break;
      }
    }
    
    // Convert second image to template
    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
      Serial.println("❌ Could not convert second image");
      displayMessage("Convert error!", "", "", "", 1500);
      attempt++;
      continue;
    }
    
    // Create model
    p = finger.createModel();
    if (p == FINGERPRINT_OK) {
      Serial.println("✅ Prints matched!");
      displayMessage("Prints matched!", "", "", "", 1500);
      
      // Store model
      p = finger.storeModel(id);
      if (p == FINGERPRINT_OK) {
        Serial.println("🎉 FINGERPRINT ENROLLED SUCCESSFULLY!");
        Serial.println("🆔 Stored at ID: " + String(id));
        displayMessage("Fingerprint", "Enrolled!", "ID: " + String(id), "", 3000);
        return true;
      } else {
        Serial.println("❌ Could not store model");
        displayMessage("Store error!", "", "", "", 1500);
        attempt++;
        continue;
      }
    } else {
      Serial.println("❌ Fingerprints did not match");
      displayMessage("No match!", "", "", "", 1500);
      attempt++;
      continue;
    }
  }
  
  Serial.println("❌ Enrollment failed after " + String(maxAttempts) + " attempts");
  displayMessage("Enrollment", "failed!", "", "", 3000);
  return false;
}

// === Function: Update backend after successful enrollment ===
bool updateBackendEnrollment(int fingerprintID) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot update backend");
    displayMessage("WiFi not", "connected!", "", "", 2000);
    return false;
  }
  
  HTTPClient http;
  String url = String(employeesURL) + "?enroll";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON with enrollment data
  String jsonData = "{\"rollno\":\"" + pendingEmployeeRoll + "\",\"fingerId\":\"" + String(fingerprintID) + "\"}";
  
  Serial.println("📤 Sending to backend: " + jsonData);
  
  int httpResponseCode = http.PUT(jsonData);
  String response = http.getString(); // Get response body
  
  Serial.println("📊 Response code: " + String(httpResponseCode));
  Serial.println("📄 Response body: " + response);
  
  if (httpResponseCode == 200) {
    // Parse the response to check if it was successful
    DynamicJsonDocument doc(256);
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc["success"] == true) {
      Serial.println("✅ Backend updated with enrollment status");
      displayMessage("Backend updated!", "Success", "", "", 2000);
      http.end();
      return true;
    } else {
      Serial.println("❌ Backend update failed: " + response);
      displayMessage("Update failed!", "Check logs", "", "", 2000);
      http.end();
      return false;
    }
  } else {
    Serial.println("❌ Failed to update backend. HTTP code: " + String(httpResponseCode));
    displayMessage("Update failed!", "HTTP " + String(httpResponseCode), "", "", 2000);
    http.end();
    return false;
  }
}

// === Function: Save attendance to backend ===
// === Function: Save attendance to backend ===
bool saveAttendance(int fingerprintID, String name, String rollno) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot save attendance");
    displayMessage("WiFi not", "connected!", "", "", 2000);
    return false;
  }
  
  HTTPClient http;
  http.begin(attendanceURL);
  http.addHeader("Content-Type", "application/json");

  // Prepare JSON data with all required fields
  String jsonData = "{\"finger_id\":\"" + String(fingerprintID) + 
                    "\",\"name\":\"" + name + 
                    "\",\"rollno\":\"" + rollno + "\"}";

  Serial.println("📤 Sending attendance data: " + jsonData);

  int httpResponseCode = http.POST(jsonData);
  String response = http.getString();
  
  Serial.println("📊 Response code: " + String(httpResponseCode));
  Serial.println("📥 Response: " + response);
  
  // Check if the response contains HTML (indicating a PHP error)
  if (response.indexOf("<html>") >= 0 || response.indexOf("<b>Fatal error</b>") >= 0 || response.indexOf("<br />") >= 0) {
    Serial.println("❌ PHP error detected in response");
    displayMessage("Server error!", "Check logs", "", "", 3000);
    http.end();
    return false;
  }
  
  // Parse the JSON response
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) {
    Serial.println("❌ Failed to parse JSON response");
    displayMessage("JSON parse", "error!", "", "", 3000);
    http.end();
    return false;
  }
  
  // Check if the response indicates success
  if (doc["success"] == true) {
    String loginTime = doc["login_time"] | "Not recorded";
    String logoutTime = doc["logout_time"] | "Not recorded";
    String status = doc["status"] | "unknown";
    
    if (httpResponseCode == 201) {
      Serial.println("✅ Login recorded successfully");
      displayMessage("Login recorded!", "Time: " + loginTime, "", "", 3000);
    } else if (httpResponseCode == 200) {
      if (status == "left") {
        Serial.println("✅ Logout recorded successfully");
        displayMessage("Logout recorded!", "Time: " + logoutTime, "", "", 3000);
      } else {
        Serial.println("✅ Attendance updated successfully");
        displayMessage("Attendance updated!", "Login: " + loginTime, "Logout: " + logoutTime, "", 3000);
      }
    }
    http.end();
    return true;
  } else {
    // Handle error response
    String errorMsg = doc["error"] | "Unknown error";
    Serial.println("❌ Failed to record attendance: " + errorMsg);
    displayMessage("Attendance", "failed!", errorMsg, "", 3000);
    http.end();
    return false;
  }
}
  
// === Function: Get employee details by fingerprint ID ===
bool getEmployeeDetails(int fingerprintID, String &name, String &rollno) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected - cannot fetch employee details");
    displayMessage("WiFi not", "connected!", "", "", 2000);
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
      displayMessage("JSON parse", "error!", "", "", 2000);
      http.end();
      return false;
    }
  } else {
    Serial.println("❌ Backend request failed: " + String(httpCode));
    displayMessage("Request failed:", "HTTP " + String(httpCode), "", "", 2000);
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
      displayMessage("Scan ID:", String(finger.fingerID), "", "", 1500);
    }
    return finger.fingerID;
  } else {
    if (!enrollmentMode) { // Only log during normal operation
      Serial.println("❌ No match found");
      displayMessage("No match", "found!", "", "", 1500);
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
        displayMessage("Attendance:", name, "Roll: " + rollno, status, 3000);
        
        // Save to backend attendance.php - now includes name and rollno
        if (saveAttendance(id, name, rollno)) {
          Serial.println("✅ Attendance successfully recorded");
          displayMessage("Attendance", "recorded!", "", "", 3000);
        } else {
          Serial.println("❌ Failed to record attendance");
          displayMessage("Record", "failed!", "", "", 3000);
        }
      } else {
        Serial.println("❌ Failed to fetch employee details");
        displayMessage("Fetch details", "failed!", "", "", 3000);
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
  displayMessage("Enrollment:", pendingEmployeeName, "", "", 2000);
  
  if (enrollFingerprint(pendingEmployeeID)) {
    // Enrollment successful
    if (updateBackendEnrollment(pendingEmployeeID)) {
      Serial.println("🎉 ENROLLMENT COMPLETED FOR: " + pendingEmployeeName);
      Serial.println("🆔 Fingerprint ID: " + String(pendingEmployeeID));
      displayMessage("ENROLLMENT", "COMPLETED!", pendingEmployeeName, "ID: " + String(pendingEmployeeID), 4000);
      
      // Reset enrollment mode
      enrollmentMode = false;
      pendingEmployeeName = "";
      pendingEmployeeRoll = "";
      pendingEmployeeID = -1;
      
      Serial.println("🔄 Returning to normal operation...");
      displayMessage("Returning to", "normal mode...", "", "", 3000);
      
      // Immediately check for more pending enrollments
      delay(1000);
      if (checkForPendingEnrollments()) {
        // If there are more pending enrollments, the system will enter enrollment mode again
      }
    } else {
      Serial.println("❌ Failed to update backend with enrollment data");
      displayMessage("Backend update", "failed!", "", "", 3000);
      
      // Stay in enrollment mode to retry
      delay(3000);
    }
  } else {
    Serial.println("❌ Enrollment failed. Will retry in 5 seconds...");
    displayMessage("Enrollment", "failed!", "Retrying...", "", 3000);
    delay(5000);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize OLED display
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }
  
  // Clear the display buffer
  display.clearDisplay();
  display.display();
  
  Serial.println("🚀 Starting Enhanced Fingerprint Attendance System");
  Serial.println("================================================");
  displayMessage("Starting", "Attendance System", "", "", 3000);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("🌐 Connecting to WiFi");
  displayMessage("Connecting to", "WiFi...", "", "", 2000);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.println("📡 IP Address: " + WiFi.localIP().toString());
  displayMessage("WiFi connected!", "IP: " + WiFi.localIP().toString(), "", "", 3000);
  
  // Configure time
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("⏳ Waiting for time sync...");
  displayMessage("Syncing time...", "", "", "", 2000);
  delay(2000);
  
  // Initialize fingerprint sensor
  mySerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);
  
  if (finger.verifyPassword()) {
    Serial.println("✅ Fingerprint sensor detected!");
    displayMessage("Fingerprint", "sensor OK!", "", "", 2000);
    
    // Get sensor parameters
    finger.getParameters();
    Serial.println("📊 Sensor Info:");
    Serial.println("   Template Count: " + String(finger.templateCount));
    Serial.println("   Library Size: " + String(finger.capacity));
    displayMessage("Templates:", String(finger.templateCount), "Capacity: " + String(finger.capacity), "", 3000);
  } else {
    Serial.println("❌ Sensor not found!");
    displayMessage("Sensor not", "found!", "", "", 3000);
    while (1) delay(10);
  }
  
  Serial.println("🔄 System ready! Monitoring for new employees...");
  Serial.println("================================================");
  displayMessage("System", "ready", "", "", 3000);
  
  // Initial check for pending enrollments
  checkForPendingEnrollments();
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
    
    // Show "System working" message when idle for DISPLAY_INTERVAL
    if (currentTime - lastDisplayTime >= DISPLAY_INTERVAL) {
      displayMessage("System", "working", "", "", 0); // No delay for this message
    }
  }
  
  delay(1000); // Small delay to prevent excessive looping
}