"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MapEditor, type MapRegion as MapEditorRegion } from "@/components/MapEditor";

interface Conference {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_active: boolean;
  join_password: string;
}

interface Location {
  id: string;
  name: string;
  description: string;
  floor: string;
  building: string;
  location_type: string;
}

interface Map {
  id: string;
  conference_id: string;
  location_id: string | null;
  name: string;
  image_path: string;
  image_width: number;
  image_height: number;
  is_active: boolean;
  created_at: string;
  location?: {
    id: string;
    name: string;
    floor?: string;
    building?: string;
    location_type?: string;
  };
}

interface MapRegion {
  id: string;
  map_id: string;
  qr_code?: string;
  label: string;
  shape_type: 'polygon' | 'rect' | 'circle';
  coords: Record<string, any>;
  z_index: number;
  is_active: boolean;
}

export default function ConferenceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const conferenceId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [conference, setConference] = useState<Conference | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    is_active: true,
    join_password: "",
  });

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    description: "",
    floor: "",
    building: "",
    location_type: "",
  });

  // Maps
  const [maps, setMaps] = useState<Map[]>([]);
  const [showAddMap, setShowAddMap] = useState(false);
  const [selectedMap, setSelectedMap] = useState<Map | null>(null);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [newMap, setNewMap] = useState({
    name: "",
    location_id: "",
    image_width: 1200,
    image_height: 800,
    is_active: true,
  });

  // Map Regions
  const [mapRegions, setMapRegions] = useState<MapRegion[]>([]);

  const locationById = useMemo(() => {
    const dictionary: Record<string, Location> = {};
    locations.forEach((location) => {
      dictionary[location.id] = location;
    });
    return dictionary;
  }, [locations]);

  const mapByLocationId = useMemo(() => {
    const dictionary: Record<string, Map> = {};
    maps.forEach((map) => {
      if (map.location_id) {
        dictionary[map.location_id] = map;
      }
    });
    return dictionary;
  }, [maps]);

  const availableLocationsForNewMap = useMemo(() => {
    return locations.filter((location) => !mapByLocationId[location.id]);
  }, [locations, mapByLocationId]);

  const selectedMapLocation = useMemo(() => {
    if (!selectedMap) {
      return null;
    }
    if (selectedMap.location) {
      return selectedMap.location;
    }
    if (selectedMap.location_id) {
      return locationById[selectedMap.location_id] ?? null;
    }
    return null;
  }, [selectedMap, locationById]);

  useEffect(() => {
    if (conferenceId) {
      loadConference();
      loadLocations();
      loadMaps();
    }
  }, [conferenceId]);

  useEffect(() => {
    if (selectedMap) {
      loadMapRegions();
    }
  }, [selectedMap]);

  useEffect(() => {
    if (!showAddMap) {
      return;
    }

    if (availableLocationsForNewMap.length === 0) {
      setNewMap((prev) => ({
        ...prev,
        location_id: "",
      }));
      return;
    }

    const hasSelected = availableLocationsForNewMap.some(
      (location) => location.id === newMap.location_id
    );

    if (!hasSelected) {
      setNewMap((prev) => ({
        ...prev,
        location_id: availableLocationsForNewMap[0].id,
      }));
    }
  }, [showAddMap, availableLocationsForNewMap, newMap.location_id]);

  const loadConference = async () => {
    setLoading(true);
    try {
      const data = await db.getConference(conferenceId);
      setConference(data);
      setFormData({
        name: data.name,
        description: data.description || "",
        start_date: data.start_date,
        end_date: data.end_date,
        location: data.location || "",
        is_active: data.is_active,
        join_password: data.join_password || "",
      });
    } catch (err) {
      console.error("Failed to load conference:", err);
      setError("学会の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await db.getLocations(conferenceId);
      setLocations(data);
    } catch (err) {
      console.error("Failed to load locations:", err);
    }
  };

  const loadMaps = async () => {
    try {
      const data = await db.getMaps(conferenceId);
      setMaps(data);

      if (selectedMap) {
        const updated = data.find((map) => map.id === selectedMap.id);
        if (updated) {
          setSelectedMap(updated);
        }
      } else if (data.length > 0) {
        setSelectedMap(data[0]);
      }
    } catch (err) {
      console.error("Failed to load maps:", err);
    }
  };

  const loadMapRegions = async () => {
    if (!selectedMap) return;
    try {
      const data = await db.getMapRegions(selectedMap.id);
      setMapRegions(data);
    } catch (err) {
      console.error("Failed to load map regions:", err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!formData.name || !formData.start_date || !formData.end_date) {
        setError("必須項目を入力してください");
        return;
      }

      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        setError("終了日は開始日以降である必要があります");
        return;
      }

      await db.updateConference(conferenceId, {
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        location: formData.location || undefined,
        is_active: formData.is_active,
        join_password: formData.join_password || undefined,
      });

      setSuccess("学会情報を更新しました");
      loadConference();
    } catch (err) {
      console.error("Failed to update conference:", err);
      setError("学会情報の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (!newLocation.name) {
        setError("場所名を入力してください");
        return;
      }

      await db.createLocation({
        conference_id: conferenceId,
        name: newLocation.name,
        description: newLocation.description || undefined,
        floor: newLocation.floor || undefined,
        building: newLocation.building || undefined,
        location_type: newLocation.location_type || undefined,
      });

      setNewLocation({
        name: "",
        description: "",
        floor: "",
        building: "",
        location_type: "",
      });
      setShowAddLocation(false);
      loadLocations();
      setSuccess("場所を追加しました");
    } catch (err) {
      console.error("Failed to add location:", err);
      setError("場所の追加に失敗しました");
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("この場所を削除してもよろしいですか？")) {
      return;
    }

    try {
      await db.deleteLocation(locationId);
      loadLocations();
      setSuccess("場所を削除しました");
    } catch (err) {
      console.error("Failed to delete location:", err);
      setError("場所の削除に失敗しました");
    }
  };

  const handleMapFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMapFile(e.target.files[0]);
    }
  };

  const handleAddMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUploadingMap(true);

    try {
      if (!newMap.name || !mapFile || !newMap.location_id) {
        setError("マップ名・画像・紐づける場所を選択してください");
        setUploadingMap(false);
        return;
      }

      // Upload map image to Supabase Storage
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 10);
      const sanitizedName = mapFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const storagePath = `maps/${conferenceId}/${timestamp}_${random}_${sanitizedName}`;

      const { path } = await db.uploadFile('maps', storagePath, mapFile);

      // Create map record
      const createdMap = await db.createMap({
        conference_id: conferenceId,
        location_id: newMap.location_id,
        name: newMap.name,
        image_path: path,
        image_width: newMap.image_width,
        image_height: newMap.image_height,
        is_active: newMap.is_active,
      });

      setNewMap({
        name: "",
        location_id: "",
        image_width: 1200,
        image_height: 800,
        is_active: true,
      });
      setMapFile(null);
      setShowAddMap(false);
      setSelectedMap(createdMap);
      loadMaps();
      setSuccess("マップを追加しました");
    } catch (err) {
      console.error("Failed to add map:", err);
      setError("マップの追加に失敗しました");
    } finally {
      setUploadingMap(false);
    }
  };

  const handleDeleteMap = async (mapId: string) => {
    if (!confirm("このマップを削除してもよろしいですか？")) {
      return;
    }

    try {
      await db.deleteMap(mapId);
      if (selectedMap?.id === mapId) {
        setSelectedMap(null);
        setMapRegions([]);
      }
      loadMaps();
      setSuccess("マップを削除しました");
    } catch (err) {
      console.error("Failed to delete map:", err);
      setError("マップの削除に失敗しました");
    }
  };

  const handleSaveRegionFromEditor = async (
    region: Omit<MapEditorRegion, "id">
  ) => {
    setError("");

    try {
      if (!selectedMap) {
        setError("マップが選択されていません");
        return;
      }

      await db.createMapRegion({
        map_id: selectedMap.id,
        qr_code: region.qr_code || undefined,
        label: region.label || undefined,
        shape_type: region.shape_type,
        coords: region.coords,
        z_index: region.z_index,
        is_active: region.is_active,
      });

      loadMapRegions();
      setSuccess("マップ領域を追加しました");
    } catch (err) {
      console.error("Failed to add map region:", err);
      setError("マップ領域の追加に失敗しました");
    }
  };

  const handleDeleteRegion = async (regionId: string) => {
    if (!confirm("このマップ領域を削除してもよろしいですか？")) {
      return;
    }

    try {
      await db.deleteMapRegion(regionId);
      loadMapRegions();
      setSuccess("マップ領域を削除しました");
    } catch (err) {
      console.error("Failed to delete map region:", err);
      setError("マップ領域の削除に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "この学会を削除してもよろしいですか？関連するすべてのデータ（場所、プレゼンテーション等）も削除されます。"
      )
    ) {
      return;
    }

    try {
      await db.deleteConference(conferenceId);
      router.push("/conferences");
    } catch (err) {
      console.error("Failed to delete conference:", err);
      setError("学会の削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!conference) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">学会が見つかりません</p>
          <Button onClick={() => router.push("/conferences")}>
            学会一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">学会詳細</h1>
            <p className="text-sm text-muted-foreground mt-2">
              学会情報と会場を管理します
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/conferences")}
            >
              一覧に戻る
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              学会を削除
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-error/10 text-error border border-error/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-success/10 text-success border border-success/30 rounded-lg px-4 py-3">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
                <h2 className="text-xl font-semibold text-foreground">
                  基本情報
                </h2>

                <Input
                  label="学会名"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />

                <Textarea
                  label="説明"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />

                <Input
                  label="会場"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="開始日"
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />

                  <Input
                    label="終了日"
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm font-medium text-foreground"
                  >
                    有効な学会として表示する
                  </label>
                </div>

                <Input
                  label="参加パスワード"
                  type="password"
                  value={formData.join_password}
                  onChange={(e) =>
                    setFormData({ ...formData, join_password: e.target.value })
                  }
                  description="空欄にすると誰でも参加できます"
                />

                <Button type="submit" loading={saving} className="w-full">
                  更新
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  会場・場所管理
                </h2>
                <Button
                  size="sm"
                  onClick={() => setShowAddLocation(!showAddLocation)}
                >
                  {showAddLocation ? "キャンセル" : "場所を追加"}
                </Button>
              </div>

              {showAddLocation && (
                <form onSubmit={handleAddLocation} className="mb-6 space-y-4 p-4 bg-muted/50 rounded-lg">
                  <Input
                    label="場所名"
                    required
                    value={newLocation.name}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, name: e.target.value })
                    }
                    placeholder="例: A会場"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="建物"
                      value={newLocation.building}
                      onChange={(e) =>
                        setNewLocation({
                          ...newLocation,
                          building: e.target.value,
                        })
                      }
                      placeholder="例: 本館"
                    />

                    <Input
                      label="階"
                      value={newLocation.floor}
                      onChange={(e) =>
                        setNewLocation({ ...newLocation, floor: e.target.value })
                      }
                      placeholder="例: 3F"
                    />
                  </div>

                  <Input
                    label="場所タイプ"
                    value={newLocation.location_type}
                    onChange={(e) =>
                      setNewLocation({
                        ...newLocation,
                        location_type: e.target.value,
                      })
                    }
                    placeholder="例: hall, poster_area"
                  />

                  <Textarea
                    label="説明"
                    value={newLocation.description}
                    onChange={(e) =>
                      setNewLocation({
                        ...newLocation,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                  />

                  <Button type="submit" size="sm" className="w-full">
                    追加
                  </Button>
                </form>
              )}

              <div className="space-y-3">
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    場所が登録されていません
                  </p>
                ) : (
                  locations.map((location) => (
                    <div
                      key={location.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">
                            {location.name}
                          </h3>
                          <div className="text-xs text-muted-foreground mt-1">
                            {mapByLocationId[location.id] ? (
                              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5">
                                マップ: {mapByLocationId[location.id].name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                                マップ未登録
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2 space-y-1">
                            {location.building && (
                              <p>建物: {location.building}</p>
                            )}
                            {location.floor && <p>階: {location.floor}</p>}
                            {location.description && (
                              <p className="mt-2">{location.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id)}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  マップ管理
                </h2>
                <Button
                  size="sm"
                  onClick={() => setShowAddMap(!showAddMap)}
                >
                  {showAddMap ? "キャンセル" : "マップを追加"}
                </Button>
              </div>

              {showAddMap && (
                <form onSubmit={handleAddMap} className="mb-6 space-y-4 p-4 bg-muted/50 rounded-lg">
                  <Input
                    label="マップ名"
                    required
                    value={newMap.name}
                    onChange={(e) =>
                      setNewMap({ ...newMap, name: e.target.value })
                    }
                    placeholder="例: 東京国際フォーラム 5F"
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      紐づける場所
                    </label>
                    <select
                      value={newMap.location_id}
                      onChange={(e) =>
                        setNewMap({ ...newMap, location_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      disabled={availableLocationsForNewMap.length === 0}
                      required
                    >
                      <option value="">
                        {availableLocationsForNewMap.length === 0
                          ? "割り当て可能な場所がありません"
                          : "-- 場所を選択 --"}
                      </option>
                      {availableLocationsForNewMap.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      このマップと紐づける場所を選択してください（各場所につき1枚）。
                    </p>
                    {availableLocationsForNewMap.length === 0 && (
                      <p className="mt-1 text-xs text-error">
                        新しい場所を追加するか、既存マップを編集してください。
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="画像幅（px）"
                      type="number"
                      required
                      value={newMap.image_width.toString()}
                      onChange={(e) =>
                        setNewMap({
                          ...newMap,
                          image_width: parseInt(e.target.value) || 1200,
                        })
                      }
                    />

                    <Input
                      label="画像高さ（px）"
                      type="number"
                      required
                      value={newMap.image_height.toString()}
                      onChange={(e) =>
                        setNewMap({
                          ...newMap,
                          image_height: parseInt(e.target.value) || 800,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      マップ画像
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMapFileChange}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      required
                    />
                    {mapFile && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        選択: {mapFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="map_is_active"
                      checked={newMap.is_active}
                      onChange={(e) =>
                        setNewMap({ ...newMap, is_active: e.target.checked })
                      }
                      className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <label
                      htmlFor="map_is_active"
                      className="text-sm font-medium text-foreground"
                    >
                      有効なマップとして表示する
                    </label>
                  </div>

                  <Button type="submit" size="sm" loading={uploadingMap} className="w-full">
                    追加
                  </Button>
                </form>
              )}

              <div className="space-y-3">
                {maps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    マップが登録されていません
                  </p>
                ) : (
                  maps.map((map) => (
                    <div
                      key={map.id}
                      className={`p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer ${
                        selectedMap?.id === map.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() => setSelectedMap(map)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">
                            {map.name}
                          </h3>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p>
                              場所:
                              {" "}
                              {map.location?.name
                                ? map.location.name
                                : map.location_id
                                  ? locationById[map.location_id]?.name ?? "不明な場所"
                                  : "未割当"}
                            </p>
                            <p>
                              サイズ: {map.image_width} × {map.image_height}px
                            </p>
                            <p className="text-xs font-mono">
                              画像: {map.image_path}
                            </p>
                            <p className="text-xs">
                              状態: {map.is_active ? "有効" : "無効"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMap(map.id);
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedMap && (
              <div className="bg-card border border-border rounded-xl shadow-soft p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  マップ領域管理: {selectedMap.name}
                  {selectedMapLocation && (
                    <span className="ml-2 text-base text-muted-foreground">
                      （場所: {selectedMapLocation.name}）
                    </span>
                  )}
                </h2>

                {!selectedMapLocation && (
                  <div className="mb-4 text-sm text-error">
                    このマップにはまだ場所が紐づいていません。マップを再作成するか、データを整備してください。
                  </div>
                )}
                <MapEditor
                  imageUrl={db.getStorageUrl('maps', selectedMap.image_path)}
                  imageWidth={selectedMap.image_width}
                  imageHeight={selectedMap.image_height}
                  locationName={selectedMapLocation?.name}
                  existingRegions={mapRegions.map((region) => ({
                    id: region.id,
                    qr_code: region.qr_code,
                    label: region.label || "",
                    shape_type: region.shape_type,
                    coords: region.coords as any,
                    z_index: region.z_index,
                    is_active: region.is_active,
                  }))}
                  onSaveRegion={handleSaveRegionFromEditor}
                  onDeleteRegion={handleDeleteRegion}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
