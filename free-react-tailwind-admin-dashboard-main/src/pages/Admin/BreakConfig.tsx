import React, { useState, useEffect } from "react";
import { axiosInstance } from "../../pages/Dashboard/api";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Switch from "../../components/form/switch/Switch";
import InputField from "../../components/form/input/InputField";
import { Plus, X, Clock, Coffee, Moon } from "lucide-react";

interface BreakConfig {
  id: number;
  break_choice: string;
  break_choice_display: string;
  duration_minutes: number | null;
  enabled: boolean;
}

const BreakConfigDisplay: React.FC = () => {
  const [breaks, setBreaks] = useState<BreakConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all breaks (initial load)
  const fetchBreaks = () => {
    setLoading(true);
    axiosInstance
      .get("/break-config/")
      .then((res) => {
        setBreaks(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Failed to fetch break configs");
        setLoading(false);
      });
  };

  // Refetch breaks after CRUD (no loading spinner)
  const refetchBreaks = () => {
    axiosInstance
      .get("/break-config/")
      .then((res) => {
        setBreaks(res.data);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Failed to fetch break configs");
      });
  };

  useEffect(() => {
    fetchBreaks();
    // / eslint-disable-next-line
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-gray-500">Loading break configurations...</div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">{error}</div>
    </div>
  );

  // Group breaks by type
  const shortBreaks = breaks.filter((b: BreakConfig) => b.break_choice === "short_break");
  const mealBreak = breaks.find((b: BreakConfig) => b.break_choice === "meal_break");
  const dontDisturb = breaks.find((b: BreakConfig) => b.break_choice === "dont_disturb");
  // CRUD handlers
  const handleShortBreakChange = (id: number, changes: Partial<BreakConfig>) => {
    const breakToUpdate = breaks.find((b: BreakConfig) => b.id === id);
    if (!breakToUpdate) return;
    axiosInstance.patch(`/break-config/${id}/`, { ...breakToUpdate, ...changes })
      .then(() => refetchBreaks());
  };
  const handleRemoveShortBreak = (id: number) => {
  axiosInstance.delete(`/break-config/${id}/`).then(() => refetchBreaks());
  };
  const handleAddShortBreak = () => {
    axiosInstance.post(`/break-config/`, {
      break_choice: "short_break",
      duration_minutes: 5,
      enabled: true,
    }).then(() => refetchBreaks());
  };
  const handleMealBreakChange = (id: number, changes: Partial<BreakConfig>) => {
    const breakToUpdate = breaks.find((b: BreakConfig) => b.id === id);
    if (!breakToUpdate) return;
    axiosInstance.patch(`/break-config/${id}/`, { ...breakToUpdate, ...changes })
      .then(() => refetchBreaks());
  };
  const handleAddMealBreak = () => {
    axiosInstance.post(`/break-config/`, {
      break_choice: "meal_break",
      duration_minutes: 30,
      enabled: true,
    }).then(() => refetchBreaks());
  };
  const handleRemoveMealBreak = (id: number) => {
  axiosInstance.delete(`/break-config/${id}/`).then(() => refetchBreaks());
  };
  const handleDontDisturbChange = (id: number, changes: Partial<BreakConfig>) => {
    const breakToUpdate = breaks.find((b: BreakConfig) => b.id === id);
    if (!breakToUpdate) return;
    axiosInstance.patch(`/break-config/${id}/`, { ...breakToUpdate, ...changes })
      .then(() => refetchBreaks());
  };


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Break Configurations</h1>
          <p className="text-gray-600">Manage break settings for your organization</p>
        </div>
        <div className="grid gap-6">
          {/* Short Breaks Section */}
          <ComponentCard title="Short Breaks">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Configure multiple short breaks with different durations. Users can take these breaks throughout their work day.
              </p>
              {shortBreaks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No short breaks configured</p>
                  <p className="text-sm">Add your first short break to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shortBreaks.map(breakItem => (
                    <div key={breakItem.id} className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 flex-1">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Duration:</span>
                        <InputField
                          type="number"
                          min={1}
                          value={breakItem.duration_minutes ?? 5}
                          onChange={e => handleShortBreakChange(breakItem.id, { duration_minutes: Number(e.target.value) })}
                          className="w-20 text-center"
                          placeholder="5"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                      <Switch
                        defaultChecked={breakItem.enabled}
                        onChange={val => handleShortBreakChange(breakItem.id, { enabled: val })}
                        label={breakItem.enabled ? "Enabled" : "Disabled"}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveShortBreak(breakItem.id)}
                        className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddShortBreak}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Short Break
                </Button>
              </div>
            </div>
          </ComponentCard>
          {/* Meal Break Section */}
          <ComponentCard title="Meal Break">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Configure a single meal break with adjustable duration. Typically used for lunch breaks.
              </p>
              {mealBreak ? (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Coffee className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Duration:</span>
                      <InputField
                        type="number"
                        min={1}
                        value={mealBreak.duration_minutes ?? 30}
                        onChange={e => handleMealBreakChange(mealBreak.id, { duration_minutes: Number(e.target.value) })}
                        className="w-20 text-center"
                        placeholder="30"
                      />
                      <span className="text-sm text-gray-600">minutes</span>
                    </div>
                    <Switch
                      defaultChecked={mealBreak.enabled}
                      onChange={val => handleMealBreakChange(mealBreak.id, { enabled: val })}
                      label={mealBreak.enabled ? "Enabled" : "Disabled"}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMealBreak(mealBreak.id)}
                      className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Coffee className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium mb-3">No meal break configured</p>
                  <Button variant="primary" size="md" onClick={handleAddMealBreak}>
                    Add Meal Break
                  </Button>
                </div>
              )}
            </div>
          </ComponentCard>
          {/* Don't Disturb Section */}
          <ComponentCard title="Don't Disturb">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enable "Don't Disturb" mode to prevent interruptions. This setting has no fixed duration.
              </p>
              {dontDisturb ? (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Moon className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">Don't Disturb Mode</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">No fixed duration</span>
                    </div>
                    <Switch
                      defaultChecked={dontDisturb.enabled}
                      onChange={val => handleDontDisturbChange(dontDisturb.id, { enabled: val })}
                      label={dontDisturb.enabled ? "Enabled" : "Disabled"}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Moon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">"Don't Disturb" break is not configured</p>
                  <p className="text-sm">This feature may be managed by system settings</p>
                </div>
              )}
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
};

export default BreakConfigDisplay;