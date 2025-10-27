import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const MAPS_BUCKET = 'maps';

const resolveImageUrl = (imagePath) => {
    if (!imagePath) {
        return null;
    }
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    const { data } = supabase.storage.from(MAPS_BUCKET).getPublicUrl(imagePath);
    return data?.publicUrl ?? null;
};

const normalizeCoords = (shapeType, coords) => {
    if (!coords) {
        return null;
    }

    if (shapeType === 'rect') {
        const x = Number(coords.x);
        const y = Number(coords.y);
        const width = Number(coords.width);
        const height = Number(coords.height);
        if ([x, y, width, height].every(Number.isFinite)) {
            return { x, y, width, height };
        }
        return null;
    }

    if (shapeType === 'circle') {
        const cx = Number(coords.cx);
        const cy = Number(coords.cy);
        const r = Number(coords.r);
        if ([cx, cy, r].every(Number.isFinite)) {
            return { cx, cy, r };
        }
        return null;
    }

    if (shapeType === 'polygon' && Array.isArray(coords.points)) {
        const points = coords.points
            .map((point) => {
                const x = Number(point.x);
                const y = Number(point.y);
                if (!Number.isFinite(x) || !Number.isFinite(y)) {
                    return null;
                }
                return { x, y };
            })
            .filter(Boolean);
        if (points.length >= 3) {
            return { points };
        }
        return null;
    }

    return null;
};

const normalizeRegion = (rawRegion) => {
    if (!rawRegion) {
        return null;
    }

    const coords = (() => {
        if (!rawRegion.coords) return null;
        if (typeof rawRegion.coords === 'object') return rawRegion.coords;
        try {
            return JSON.parse(rawRegion.coords);
        } catch {
            return null;
        }
    })();

    const normalizedCoords = normalizeCoords(rawRegion.shape_type, coords);
    if (!normalizedCoords) {
        return null;
    }

    return {
        id: rawRegion.id,
        mapId: rawRegion.map_id,
        qrCode: rawRegion.qr_code ?? null,
        label: rawRegion.label ?? '',
        shapeType: rawRegion.shape_type,
        coords: normalizedCoords,
        zIndex: rawRegion.z_index ?? 0,
        isActive: rawRegion.is_active !== false
    };
};

const fetchConferenceMap = async (conferenceId) => {
    const { data, error } = await supabase
        .from('maps')
        .select(`
            id,
            conference_id,
            location_id,
            name,
            image_path,
            image_width,
            image_height,
            is_active,
            created_at,
            location:locations(
                id,
                name,
                floor,
                building,
                location_type
            ),
            map_regions(
                id,
                map_id,
                qr_code,
                label,
                shape_type,
                coords,
                z_index,
                is_active
            )
        `)
        .eq('conference_id', conferenceId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    const imageUrl = resolveImageUrl(data.image_path);
    const regions = Array.isArray(data.map_regions)
        ? data.map_regions
            .map(normalizeRegion)
            .filter((region) => region && region.isActive)
        : [];

    return {
        id: data.id,
        conferenceId: data.conference_id,
        locationId: data.location_id,
        name: data.name,
        imagePath: data.image_path,
        imageUrl,
        imageWidth: data.image_width,
        imageHeight: data.image_height,
        regions,
        location: data.location ?? null
    };
};

const useConferenceMap = (conferenceId, options = {}) => {
    return useQuery({
        queryKey: ['conferenceMap', conferenceId],
        queryFn: () => fetchConferenceMap(conferenceId),
        enabled: Boolean(conferenceId),
        staleTime: 1000 * 60,
        ...options
    });
};

export default useConferenceMap;
