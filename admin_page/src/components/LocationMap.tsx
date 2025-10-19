"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/supabase";

interface Location {
  id: string;
  name: string;
  building?: string;
  floor?: string;
  description?: string;
}

interface LocationMapProps {
  conferenceId: string;
  selectedLocationId?: string;
  onLocationSelect?: (locationId: string) => void;
}

export default function LocationMap({
  conferenceId,
  selectedLocationId,
  onLocationSelect,
}: LocationMapProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, [conferenceId]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await db.getLocations(conferenceId);
      setLocations(data);
    } catch (err) {
      console.error("Failed to load locations:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-soft p-8 text-center">
        <p className="text-muted-foreground">マップを読み込み中...</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-soft p-8 text-center">
        <p className="text-muted-foreground">
          この学会には場所が登録されていません
        </p>
      </div>
    );
  }

  // Group locations by building and floor
  const groupedLocations = locations.reduce((acc, location) => {
    const building = location.building || "その他";
    const floor = location.floor || "未指定";

    if (!acc[building]) {
      acc[building] = {};
    }
    if (!acc[building][floor]) {
      acc[building][floor] = [];
    }
    acc[building][floor].push(location);

    return acc;
  }, {} as Record<string, Record<string, Location[]>>);

  return (
    <div className="bg-card border border-border rounded-xl shadow-soft p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">会場マップ</h3>

      <div className="space-y-6">
        {Object.entries(groupedLocations).map(([building, floors]) => (
          <div key={building}>
            <h4 className="text-md font-medium text-foreground mb-3 pb-2 border-b border-border">
              {building}
            </h4>

            <div className="space-y-4">
              {Object.entries(floors).map(([floor, locs]) => (
                <div key={floor} className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {floor}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {locs.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => onLocationSelect?.(location.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedLocationId === location.id
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <p className="text-sm font-medium">{location.name}</p>
                        {location.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {location.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
