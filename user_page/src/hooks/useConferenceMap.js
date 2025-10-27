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

const fetchConferenceMaps = async (conferenceId) => {
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
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return (data ?? []).map((map) => {
        const imageUrl = resolveImageUrl(map.image_path);
        const regions = Array.isArray(map.map_regions)
            ? map.map_regions
                .map(normalizeRegion)
                .filter((region) => region && region.isActive)
            : [];

        return {
            id: map.id,
            conferenceId: map.conference_id,
            locationId: map.location_id,
            name: map.name,
            imagePath: map.image_path,
            imageUrl,
            imageWidth: map.image_width,
            imageHeight: map.image_height,
            regions,
            location: map.location ?? null
        };
    });
};

const useConferenceMap = (conferenceId, options = {}) => {
    return useQuery({
        queryKey: ['conferenceMaps', conferenceId],
        queryFn: () => fetchConferenceMaps(conferenceId),
        enabled: Boolean(conferenceId),
        staleTime: 1000 * 60,
        ...options
    });
};

export default useConferenceMap;
