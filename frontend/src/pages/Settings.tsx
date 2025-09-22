import { useState } from "react";
import { Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";

interface SettingsState {
  loginStartTime: string;
  loginEndTime: string;
  logoutStartTime: string;
  logoutEndTime: string;
}

export default function Settings() {
  const { settings, setSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSettingChange = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSaving(false);
    toast({
      title: "Settings Saved",
      description: "Your settings have been successfully updated.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Configure your attendance system preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Time Windows */}
        <Card className="gradient-card shadow-custom border-0 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Time Windows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Login Time */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Login Time Window</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loginStart" className="text-xs text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    id="loginStart"
                    type="time"
                    value={settings.loginStartTime}
                    onChange={(e) => handleSettingChange("loginStartTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginEnd" className="text-xs text-muted-foreground">
                    End Time (Late After)
                  </Label>
                  <Input
                    id="loginEnd"
                    type="time"
                    value={settings.loginEndTime}
                    onChange={(e) => handleSettingChange("loginEndTime", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Logout Time */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Logout Time Window</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoutStart" className="text-xs text-muted-foreground">
                    Earliest Time
                  </Label>
                  <Input
                    id="logoutStart"
                    type="time"
                    value={settings.logoutStartTime}
                    onChange={(e) => handleSettingChange("logoutStartTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoutEnd" className="text-xs text-muted-foreground">
                    Latest Time
                  </Label>
                  <Input
                    id="logoutEnd"
                    type="time"
                    value={settings.logoutEndTime}
                    onChange={(e) => handleSettingChange("logoutEndTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="gradient-primary shadow-primary"
        >
          {isSaving ? (
            <>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
