"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface Location {
  id: string;
  name: string;
}

interface Point {
  x: number;
  y: number;
}

export interface RectCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleCoords {
  cx: number;
  cy: number;
  r: number;
}

export interface PolygonCoords {
  points: Point[];
}

export interface MapRegion {
  id?: string;
  location_id: string;
  location_name?: string;
  label: string;
  shape_type: "rect" | "circle" | "polygon";
  coords: RectCoords | CircleCoords | PolygonCoords | Record<string, any>;
  z_index: number;
  is_active: boolean;
}

interface MapEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  locations: Location[];
  existingRegions: MapRegion[];
  onSaveRegion: (region: Omit<MapRegion, "id">) => Promise<void>;
  onDeleteRegion: (regionId: string) => Promise<void>;
}

export function MapEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  locations,
  existingRegions,
  onSaveRegion,
  onDeleteRegion,
}: MapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [shapeType, setShapeType] = useState<"rect" | "circle" | "polygon">("rect");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      drawCanvas(img);
    };
  }, [imageUrl]);

  // Redraw canvas when regions or hover state changes
  useEffect(() => {
    if (image) {
      drawCanvas(image);
    }
  }, [existingRegions, hoveredRegion, currentPoints, startPoint, image]);

  const drawCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Calculate scale
    const scaleX = canvas.width / imageWidth;
    const scaleY = canvas.height / imageHeight;
    setScale(scaleX); // Assuming uniform scale

    // Draw existing regions
    existingRegions.forEach((region) => {
      const isHovered = hoveredRegion === region.id;
      drawRegion(ctx, region, scaleX, scaleY, isHovered);
    });

    // Draw current drawing
    if (shapeType === "rect" && startPoint && currentPoints.length > 0) {
      const endPoint = currentPoints[0];
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        startPoint.x,
        startPoint.y,
        endPoint.x - startPoint.x,
        endPoint.y - startPoint.y
      );
    } else if (shapeType === "circle" && startPoint && currentPoints.length > 0) {
      const endPoint = currentPoints[0];
      const radius = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
      );
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (shapeType === "polygon" && currentPoints.length > 0) {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fill();

      // Draw points
      currentPoints.forEach((point) => {
        ctx.fillStyle = "rgba(59, 130, 246, 1)";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  };

  const drawRegion = (
    ctx: CanvasRenderingContext2D,
    region: MapRegion,
    scaleX: number,
    scaleY: number,
    isHovered: boolean
  ) => {
    const alpha = isHovered ? 0.5 : 0.3;
    const strokeAlpha = isHovered ? 1 : 0.8;

    ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
    ctx.strokeStyle = `rgba(239, 68, 68, ${strokeAlpha})`;
    ctx.lineWidth = 2;

    if (region.shape_type === "rect") {
      const coords = region.coords as RectCoords;
      const x = coords.x * scaleX;
      const y = coords.y * scaleY;
      const width = coords.width * scaleX;
      const height = coords.height * scaleY;

      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      // Draw label
      if (region.location_name) {
        ctx.fillStyle = "white";
        ctx.font = "14px sans-serif";
        ctx.fillText(region.location_name, x + 5, y + 20);
      }
    } else if (region.shape_type === "circle") {
      const coords = region.coords as CircleCoords;
      const cx = coords.cx * scaleX;
      const cy = coords.cy * scaleY;
      const r = coords.r * scaleX;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw label
      if (region.location_name) {
        ctx.fillStyle = "white";
        ctx.font = "14px sans-serif";
        ctx.fillText(region.location_name, cx - 30, cy);
      }
    } else if (region.shape_type === "polygon") {
      const coords = region.coords as PolygonCoords;
      if (coords.points && coords.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(coords.points[0].x * scaleX, coords.points[0].y * scaleY);
        for (let i = 1; i < coords.points.length; i++) {
          ctx.lineTo(coords.points[i].x * scaleX, coords.points[i].y * scaleY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw label at first point
        if (region.location_name) {
          ctx.fillStyle = "white";
          ctx.font = "14px sans-serif";
          ctx.fillText(
            region.location_name,
            coords.points[0].x * scaleX + 5,
            coords.points[0].y * scaleY + 20
          );
        }
      }
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Canvas要素の実際のサイズと表示サイズの比率を計算
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // マウス座標をCanvas座標系に変換
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedLocation) {
      alert("場所を選択してください");
      return;
    }

    const { x, y } = getCanvasCoordinates(e);

    if (shapeType === "polygon") {
      // Add point to polygon
      setCurrentPoints([...currentPoints, { x, y }]);
    } else {
      // Start drawing rect or circle (only if not already drawing)
      if (!isDrawing) {
        setStartPoint({ x, y });
        setIsDrawing(true);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(e);

    if (isDrawing && startPoint) {
      setCurrentPoints([{ x, y }]);
    }

    // Check if hovering over existing region
    const scaleX = canvas.width / imageWidth;
    const scaleY = canvas.height / imageHeight;

    let foundRegion: string | null = null;
    for (const region of existingRegions) {
      if (isPointInRegion({ x, y }, region, scaleX, scaleY)) {
        foundRegion = region.id || null;
        break;
      }
    }
    setHoveredRegion(foundRegion);
  };

  const isPointInRegion = (
    point: Point,
    region: MapRegion,
    scaleX: number,
    scaleY: number
  ): boolean => {
    if (region.shape_type === "rect") {
      const coords = region.coords as RectCoords;
      const x = coords.x * scaleX;
      const y = coords.y * scaleY;
      const width = coords.width * scaleX;
      const height = coords.height * scaleY;
      return (
        point.x >= x &&
        point.x <= x + width &&
        point.y >= y &&
        point.y <= y + height
      );
    } else if (region.shape_type === "circle") {
      const coords = region.coords as CircleCoords;
      const cx = coords.cx * scaleX;
      const cy = coords.cy * scaleY;
      const r = coords.r * scaleX;
      const distance = Math.sqrt(
        Math.pow(point.x - cx, 2) + Math.pow(point.y - cy, 2)
      );
      return distance <= r;
    }
    return false;
  };

  const handleCanvasMouseUp = () => {
    // Only finish drawing for rect and circle (not polygon)
    if (shapeType === "polygon") return;

    if (!isDrawing || !startPoint || currentPoints.length === 0) return;

    finishDrawing();
  };

  const finishDrawing = () => {
    if (!selectedLocation) {
      resetDrawing();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      resetDrawing();
      return;
    }

    const scaleX = canvas.width / imageWidth;
    const scaleY = canvas.height / imageHeight;

    let coords: RectCoords | CircleCoords | PolygonCoords;

    if (shapeType === "rect" && startPoint && currentPoints.length > 0) {
      const endPoint = currentPoints[0];
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);

      // 最小サイズチェック（10ピクセル未満は無視）
      if (width < 10 || height < 10) {
        resetDrawing();
        return;
      }

      const x = Math.min(startPoint.x, endPoint.x) / scaleX;
      const y = Math.min(startPoint.y, endPoint.y) / scaleY;
      const finalWidth = width / scaleX;
      const finalHeight = height / scaleY;

      coords = { x, y, width: finalWidth, height: finalHeight };
    } else if (shapeType === "circle" && startPoint && currentPoints.length > 0) {
      const endPoint = currentPoints[0];
      const radius = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) +
          Math.pow(endPoint.y - startPoint.y, 2)
      );

      // 最小サイズチェック（半径10ピクセル未満は無視）
      if (radius < 10) {
        resetDrawing();
        return;
      }

      const cx = startPoint.x / scaleX;
      const cy = startPoint.y / scaleY;
      const r = radius / scaleX;

      coords = { cx, cy, r };
    } else if (shapeType === "polygon" && currentPoints.length >= 3) {
      const points = currentPoints.map((p) => ({
        x: p.x / scaleX,
        y: p.y / scaleY,
      }));
      coords = { points };
    } else {
      resetDrawing();
      return;
    }

    const location = locations.find((l) => l.id === selectedLocation);
    const region: Omit<MapRegion, "id"> = {
      location_id: selectedLocation,
      label: location?.name || "",
      shape_type: shapeType,
      coords,
      z_index: 1,
      is_active: true,
    };

    onSaveRegion(region);
    resetDrawing();
  };

  const resetDrawing = () => {
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoints([]);
  };

  const handleFinishPolygon = () => {
    if (currentPoints.length < 3) {
      alert("多角形は最低3点が必要です");
      return;
    }
    finishDrawing();
  };

  const handleCancelDrawing = () => {
    resetDrawing();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            場所を選択
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">-- 場所を選択 --</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            図形タイプ
          </label>
          <select
            value={shapeType}
            onChange={(e) => {
              setShapeType(e.target.value as "rect" | "circle" | "polygon");
              resetDrawing();
            }}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="rect">矩形</option>
            <option value="circle">円形</option>
            <option value="polygon">多角形</option>
          </select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
        <p className="font-medium mb-1">使い方:</p>
        {shapeType === "rect" && (
          <p>・ドラッグして矩形を描画してください</p>
        )}
        {shapeType === "circle" && (
          <p>・中心から外側にドラッグして円を描画してください</p>
        )}
        {shapeType === "polygon" && (
          <>
            <p>・クリックして頂点を追加してください（最低3点）</p>
            <p>・完了したら「多角形を完成」ボタンをクリックしてください</p>
          </>
        )}
      </div>

      {shapeType === "polygon" && currentPoints.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={handleFinishPolygon} size="sm">
            多角形を完成 ({currentPoints.length}点)
          </Button>
          <Button onClick={handleCancelDrawing} size="sm" variant="outline">
            キャンセル
          </Button>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={(800 * imageHeight) / imageWidth}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="w-full cursor-crosshair"
          style={{ maxWidth: "100%" }}
        />
      </div>

      {existingRegions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            登録済み領域 ({existingRegions.length})
          </h3>
          <div className="space-y-2">
            {existingRegions.map((region) => (
              <div
                key={region.id}
                className={`p-3 border rounded-lg flex items-center justify-between transition-colors ${
                  hoveredRegion === region.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                onMouseEnter={() => setHoveredRegion(region.id || null)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {region.location_name || "場所未設定"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {region.shape_type === "rect" && "矩形"}
                    {region.shape_type === "circle" && "円形"}
                    {region.shape_type === "polygon" && "多角形"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => region.id && onDeleteRegion(region.id)}
                >
                  削除
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
