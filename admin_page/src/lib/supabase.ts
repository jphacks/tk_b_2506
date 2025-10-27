import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions
export const db = {
  // ========== Conferences ==========
  // Get all conferences
  async getConferences(includeInactive = false) {
    let query = supabase
      .from('conferences')
      .select('*')
      .order('start_date', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  // Get a single conference by ID
  async getConference(id: string) {
    const { data, error } = await supabase
      .from('conferences')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new conference
  async createConference(conference: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    location?: string;
    is_active?: boolean;
    join_password?: string;
  }) {
    const { data, error } = await supabase
      .from('conferences')
      .insert(conference)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a conference
  async updateConference(id: string, updates: Partial<{
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    location: string;
    is_active: boolean;
    join_password: string;
  }>) {
    const { data, error } = await supabase
      .from('conferences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a conference
  async deleteConference(id: string) {
    const { error } = await supabase
      .from('conferences')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ========== Locations ==========
  // Get all locations for a conference
  async getLocations(conferenceId: string) {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('name');

    if (error) throw error;
    return data ?? [];
  },

  // Get a single location by ID
  async getLocation(id: string) {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new location
  async createLocation(location: {
    conference_id: string;
    name: string;
    description?: string;
    qr_code: string;
    floor?: string;
    building?: string;
    location_type?: string;
  }) {
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a location
  async updateLocation(id: string, updates: Partial<{
    name: string;
    description: string;
    qr_code: string;
    floor: string;
    building: string;
    location_type: string;
  }>) {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a location
  async deleteLocation(id: string) {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ========== Tags ==========
  // Get all tags
  async getTags() {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;
    return data ?? [];
  },

  // Create a new tag
  async createTag(name: string, description?: string) {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ========== Presentations ==========
  // Get presentations for a conference
  async getPresentations(conferenceId: string) {
    const { data, error } = await supabase
      .from('presentations')
      .select(`
        *,
        location:locations(id, name),
        tags:presentation_tags(
          tag:tags(id, name, description)
        )
      `)
      .eq('conference_id', conferenceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // Create a new presentation
  async createPresentation(presentation: {
    conference_id: string;
    title: string;
    abstract?: string;
    pdf_url?: string;
    ai_summary?: string;
    presentation_type: 'oral' | 'poster';
    location_id?: string;
    presenter_name?: string;
    presenter_affiliation?: string;
    scheduled_at?: string;
  }) {
    const { data, error } = await supabase
      .from('presentations')
      .insert(presentation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a presentation
  async updatePresentation(id: string, updates: Partial<{
    title: string;
    abstract: string;
    pdf_url: string;
    ai_summary: string;
    presentation_type: 'oral' | 'poster';
    location_id: string;
    presenter_name: string;
    presenter_affiliation: string;
    scheduled_at: string;
  }>) {
    const { data, error } = await supabase
      .from('presentations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add tags to a presentation
  async addPresentationTags(presentationId: string, tagIds: string[]) {
    const insertData = tagIds.map(tagId => ({
      presentation_id: presentationId,
      tag_id: tagId
    }));

    const { data, error } = await supabase
      .from('presentation_tags')
      .insert(insertData)
      .select();

    if (error) throw error;
    return data;
  },

  // Remove all tags from a presentation
  async removePresentationTags(presentationId: string) {
    const { error } = await supabase
      .from('presentation_tags')
      .delete()
      .eq('presentation_id', presentationId);

    if (error) throw error;
  },

  // ========== Maps ==========
  // Get all maps for a conference
  async getMaps(conferenceId: string) {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // Get a single map by ID
  async getMap(id: string) {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new map
  async createMap(map: {
    conference_id: string;
    name: string;
    image_path: string;
    image_width: number;
    image_height: number;
    is_active?: boolean;
  }) {
    const { data, error } = await supabase
      .from('maps')
      .insert(map)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a map
  async updateMap(id: string, updates: Partial<{
    name: string;
    image_path: string;
    image_width: number;
    image_height: number;
    is_active: boolean;
  }>) {
    const { data, error } = await supabase
      .from('maps')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a map
  async deleteMap(id: string) {
    const { error } = await supabase
      .from('maps')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ========== Map Regions ==========
  // Get all regions for a map
  async getMapRegions(mapId: string) {
    const { data, error } = await supabase
      .from('map_regions')
      .select(`
        *,
        location:locations(id, name)
      `)
      .eq('map_id', mapId)
      .order('z_index', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // Create a new map region
  async createMapRegion(region: {
    map_id: string;
    location_id: string;
    qr_code?: string;
    label?: string;
    shape_type: 'polygon' | 'rect' | 'circle';
    coords: Record<string, any>;
    z_index?: number;
    is_active?: boolean;
  }) {
    const { data, error } = await supabase
      .from('map_regions')
      .insert(region)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a map region
  async updateMapRegion(id: string, updates: Partial<{
    location_id: string;
    qr_code: string;
    label: string;
    shape_type: 'polygon' | 'rect' | 'circle';
    coords: Record<string, any>;
    z_index: number;
    is_active: boolean;
  }>) {
    const { data, error } = await supabase
      .from('map_regions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a map region
  async deleteMapRegion(id: string) {
    const { error } = await supabase
      .from('map_regions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ========== Storage ==========
  // Upload file to storage
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { path: data.path, publicUrl };
  },

  // Get public URL for a file in storage
  getStorageUrl(bucket: string, path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  }
};
