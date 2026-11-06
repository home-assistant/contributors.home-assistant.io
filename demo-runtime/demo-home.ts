// The fake home behind every live demo on this site that needs Home
// Assistant. One home for all demos, so examples look the same everywhere:
// the same rooms, the same devices, the same lamps.
//
// Add to it when a demo needs something new, and keep it believable: a
// demo reads better when it looks like a real home.
//
// The supported_features of an entity are a bitmask of the features in the
// frontend enums (src/data/<domain>.ts). The comment next to each one lists
// the features it adds up to.
//
// The registries are typed with the types of the frontend, so a field the
// frontend adds or changes shows up in `pnpm check:demos`.

import type { DemoArea } from "frontend/demo/src/stubs/area_registry";
import type { DemoFloor } from "frontend/demo/src/stubs/floor_registry";
import type { DeviceRegistryEntry } from "frontend/src/data/device/device_registry";
import type { EntityRegistryEntry } from "frontend/src/data/entity/entity_registry";
import type { LabelRegistryEntry } from "frontend/src/data/label/label_registry";

const now = 0;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// States about time, like a running timer or the next sunrise, are relative
// to the moment the page loads. A fixed date would be in the past soon.
// Rendered on the server, they are relative to LOADED_AT instead.
export const LOADED_AT = Date.now();
const fromNow = (milliseconds: number) => new Date(LOADED_AT + milliseconds).toISOString();

export const FLOORS: DemoFloor[] = [
  { floor_id: "ground", name: "Ground floor", level: 0, icon: "mdi:home-floor-0" },
  { floor_id: "first", name: "First floor", level: 1, icon: "mdi:home-floor-1" },
];

export const AREAS: DemoArea[] = [
  {
    area_id: "living_room",
    name: "Living room",
    floor_id: "ground",
    icon: "mdi:sofa",
    temperature_entity_id: "sensor.living_room_temperature",
    humidity_entity_id: "sensor.living_room_humidity",
  },
  { area_id: "kitchen", name: "Kitchen", floor_id: "ground", icon: "mdi:stove" },
  { area_id: "hallway", name: "Hallway", floor_id: "ground", icon: "mdi:door" },
  { area_id: "garage", name: "Garage", floor_id: "ground", icon: "mdi:garage" },
  { area_id: "bedroom", name: "Bedroom", floor_id: "first", icon: "mdi:bed" },
  { area_id: "bathroom", name: "Bathroom", floor_id: "first", icon: "mdi:shower" },
  { area_id: "office", name: "Office", floor_id: "first", icon: "mdi:desk" },
  { area_id: "garden", name: "Garden", icon: "mdi:flower" },
];

export const LABELS: LabelRegistryEntry[] = [
  {
    label_id: "energy",
    name: "Energy",
    icon: "mdi:lightning-bolt",
    color: "yellow",
    description: null,
    created_at: now,
    modified_at: now,
  },
  {
    label_id: "security",
    name: "Security",
    icon: "mdi:shield-home",
    color: "red",
    description: null,
    created_at: now,
    modified_at: now,
  },
];

// The area is null for a device that moves around with someone, like a phone.
function device(
  id: string,
  name: string,
  area: string | null,
  manufacturer: string,
  model: string,
): DeviceRegistryEntry {
  return {
    id,
    name,
    area_id: area,
    manufacturer,
    model,
    model_id: null,
    name_by_user: null,
    config_entries: ["config_entry_demo"],
    config_entries_subentries: {},
    connections: [],
    identifiers: [["demo", id]],
    disabled_by: null,
    entry_type: null,
    configuration_url: null,
    sw_version: null,
    hw_version: null,
    serial_number: null,
    via_device_id: null,
    parent_device_id: null,
    labels: [],
    primary_config_entry: "config_entry_demo",
    created_at: now,
    modified_at: now,
  };
}

export const DEVICES = [
  device("living_room_lamp", "Floor lamp", "living_room", "Signify", "Hue Go"),
  device("kitchen_lights", "Kitchen ceiling", "kitchen", "IKEA", "TRADFRI"),
  device("thermostat", "Thermostat", "living_room", "ecobee", "SmartThermostat"),
  device("front_door", "Front door", "hallway", "Aqara", "Door and window sensor"),
  device("speaker", "Living room speaker", "living_room", "Sonos", "Era 100"),
  device("blinds", "Bedroom blinds", "bedroom", "IKEA", "FYRTUR"),
  device("desk_plug", "Desk plug", "office", "Shelly", "Plug S"),
  device("tv", "Living room TV", "living_room", "Samsung", "The Frame"),
  device("robot_vacuum", "Robot vacuum", "living_room", "Roborock", "S8 Pro Ultra"),
  device("plant_sensor", "Monstera", "living_room", "Xiaomi", "Mi Flora"),
  device("kitchen_window", "Kitchen window", "kitchen", "Aqara", "Door and window sensor"),
  device("hallway_light", "Hallway light", "hallway", "Signify", "Hue White"),
  device("hallway_motion", "Hallway motion sensor", "hallway", "Signify", "Hue motion sensor"),
  device("front_door_lock", "Front door lock", "hallway", "Nuki", "Smart Lock 4.0"),
  device("alarm", "Alarm panel", "hallway", "Ajax", "Hub 2 Plus"),
  device("doorbell", "Doorbell", "hallway", "Reolink", "Video Doorbell"),
  device("garage_door", "Garage door", "garage", "Meross", "Smart Garage Door Opener"),
  device("water_heater", "Water heater", "garage", "Ariston", "Lydos Hybrid"),
  device("bedroom_fan", "Bedroom fan", "bedroom", "Dyson", "Pure Cool"),
  device("humidifier", "Bedroom humidifier", "bedroom", "Levoit", "LV600S"),
  device("air_conditioner", "Bedroom air conditioner", "bedroom", "Daikin", "Perfera"),
  device("leak_sensor", "Bathroom leak sensor", "bathroom", "Aqara", "Water leak sensor"),
  device("weather_station", "Weather station", "garden", "Netatmo", "Outdoor module"),
  device("lawn_mower", "Lawn mower", "garden", "Husqvarna", "Automower 430X"),
  device("irrigation", "Garden irrigation", "garden", "Gardena", "Smart Water Control"),
  device("alex_phone", "Alex's phone", null, "Google", "Pixel 9"),
];

// Entities, with the device they belong to. An entity without a device can
// have an area of its own.
const ENTITY_LIST = [
  // Living room
  {
    entity_id: "light.living_room_lamp",
    state: "on",
    device: "living_room_lamp",
    attributes: {
      friendly_name: "Floor lamp",
      brightness: 180,
      color_mode: "hs",
      hs_color: [32, 60],
      supported_color_modes: ["hs", "color_temp"],
      min_color_temp_kelvin: 2200,
      max_color_temp_kelvin: 6500,
    },
  },
  {
    entity_id: "climate.thermostat",
    state: "heat",
    device: "thermostat",
    attributes: {
      friendly_name: "Thermostat",
      current_temperature: 20.5,
      temperature: 21,
      min_temp: 7,
      max_temp: 35,
      target_temp_step: 0.5,
      hvac_modes: ["off", "heat", "cool", "auto"],
      hvac_action: "heating",
      // Target temperature
      supported_features: 1,
    },
  },
  {
    entity_id: "sensor.living_room_temperature",
    state: "20.5",
    device: "thermostat",
    attributes: {
      friendly_name: "Living room temperature",
      unit_of_measurement: "°C",
      device_class: "temperature",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.living_room_humidity",
    state: "48",
    device: "thermostat",
    attributes: {
      friendly_name: "Living room humidity",
      unit_of_measurement: "%",
      device_class: "humidity",
      state_class: "measurement",
    },
  },
  {
    entity_id: "media_player.living_room_speaker",
    state: "playing",
    device: "speaker",
    attributes: {
      friendly_name: "Living room speaker",
      volume_level: 0.35,
      is_volume_muted: false,
      media_content_type: "music",
      media_title: "Clair de lune",
      media_artist: "Claude Debussy",
      media_album_name: "Suite bergamasque",
      media_duration: 323,
      media_position: 95,
      media_position_updated_at: fromNow(0),
      source_list: ["Line-in", "Radio 1", "Spotify"],
      source: "Spotify",
      // Pause, seek, volume set, volume mute, previous track, next track,
      // turn on, turn off, play media, select source, stop, play, and
      // browse media
      supported_features: 154559,
    },
  },
  {
    entity_id: "number.living_room_speaker_bass",
    state: "2",
    device: "speaker",
    attributes: {
      friendly_name: "Living room speaker bass",
      min: -10,
      max: 10,
      step: 1,
      mode: "slider",
    },
  },
  {
    entity_id: "media_player.living_room_tv",
    state: "off",
    device: "tv",
    attributes: {
      friendly_name: "Living room TV",
      device_class: "tv",
      source_list: ["HDMI 1", "HDMI 2", "Netflix", "YouTube"],
      // Pause, volume set, volume mute, turn on, turn off, volume step,
      // select source, and play
      supported_features: 19853,
    },
  },
  {
    entity_id: "vacuum.robot_vacuum",
    state: "docked",
    device: "robot_vacuum",
    attributes: {
      friendly_name: "Robot vacuum",
      fan_speed: "Balanced",
      fan_speed_list: ["Quiet", "Balanced", "Turbo", "Max"],
      // Pause, stop, return home, fan speed, locate, clean spot, state,
      // and start
      supported_features: 13884,
    },
  },
  {
    entity_id: "sensor.robot_vacuum_battery",
    state: "100",
    device: "robot_vacuum",
    attributes: {
      friendly_name: "Robot vacuum battery",
      unit_of_measurement: "%",
      device_class: "battery",
      state_class: "measurement",
    },
  },
  {
    entity_id: "select.robot_vacuum_mop_intensity",
    state: "Medium",
    device: "robot_vacuum",
    attributes: {
      friendly_name: "Robot vacuum mop intensity",
      options: ["Off", "Low", "Medium", "High"],
    },
  },
  {
    // The plant integration bundles the readings of a plant sensor, and
    // decides whether the plant needs attention.
    entity_id: "plant.monstera",
    state: "problem",
    area: "living_room",
    attributes: {
      friendly_name: "Monstera",
      problem: "moisture low",
      sensors: {
        moisture: "sensor.monstera_moisture",
        battery: "sensor.monstera_battery",
        temperature: "sensor.monstera_temperature",
        conductivity: "sensor.monstera_conductivity",
        brightness: "sensor.monstera_illuminance",
      },
      unit_of_measurement_dict: {
        moisture: "%",
        battery: "%",
        temperature: "°C",
        conductivity: "µS/cm",
        brightness: "lx",
      },
      moisture: 12,
      battery: 78,
      temperature: 21.3,
      conductivity: 420,
      brightness: 1850,
    },
  },
  {
    entity_id: "sensor.monstera_moisture",
    state: "12",
    device: "plant_sensor",
    attributes: {
      friendly_name: "Monstera moisture",
      unit_of_measurement: "%",
      device_class: "moisture",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.monstera_battery",
    state: "78",
    device: "plant_sensor",
    attributes: {
      friendly_name: "Monstera battery",
      unit_of_measurement: "%",
      device_class: "battery",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.monstera_temperature",
    state: "21.3",
    device: "plant_sensor",
    attributes: {
      friendly_name: "Monstera temperature",
      unit_of_measurement: "°C",
      device_class: "temperature",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.monstera_conductivity",
    state: "420",
    device: "plant_sensor",
    attributes: {
      friendly_name: "Monstera conductivity",
      unit_of_measurement: "µS/cm",
      device_class: "conductivity",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.monstera_illuminance",
    state: "1850",
    device: "plant_sensor",
    attributes: {
      friendly_name: "Monstera illuminance",
      unit_of_measurement: "lx",
      device_class: "illuminance",
      state_class: "measurement",
    },
  },

  // Kitchen
  {
    entity_id: "light.kitchen_ceiling",
    state: "off",
    device: "kitchen_lights",
    attributes: {
      friendly_name: "Kitchen ceiling",
      supported_color_modes: ["brightness"],
    },
  },
  {
    entity_id: "binary_sensor.kitchen_window",
    state: "on",
    device: "kitchen_window",
    attributes: { friendly_name: "Kitchen window", device_class: "window" },
  },

  // Hallway
  {
    entity_id: "binary_sensor.front_door",
    state: "off",
    device: "front_door",
    attributes: { friendly_name: "Front door", device_class: "door" },
  },
  {
    entity_id: "sensor.front_door_battery",
    state: "87",
    device: "front_door",
    attributes: {
      friendly_name: "Front door battery",
      unit_of_measurement: "%",
      device_class: "battery",
      state_class: "measurement",
    },
  },
  {
    entity_id: "light.hallway",
    state: "on",
    device: "hallway_light",
    attributes: {
      friendly_name: "Hallway light",
      brightness: 120,
      color_mode: "brightness",
      supported_color_modes: ["brightness"],
    },
  },
  {
    entity_id: "binary_sensor.hallway_motion",
    state: "on",
    device: "hallway_motion",
    attributes: { friendly_name: "Hallway motion", device_class: "motion" },
  },
  {
    entity_id: "sensor.hallway_illuminance",
    state: "64",
    device: "hallway_motion",
    attributes: {
      friendly_name: "Hallway illuminance",
      unit_of_measurement: "lx",
      device_class: "illuminance",
      state_class: "measurement",
    },
  },
  {
    entity_id: "lock.front_door",
    state: "locked",
    device: "front_door_lock",
    attributes: {
      friendly_name: "Front door lock",
      changed_by: "Alex",
      // Open
      supported_features: 1,
    },
  },
  {
    entity_id: "sensor.front_door_lock_battery",
    state: "64",
    device: "front_door_lock",
    attributes: {
      friendly_name: "Front door lock battery",
      unit_of_measurement: "%",
      device_class: "battery",
      state_class: "measurement",
    },
  },
  {
    entity_id: "alarm_control_panel.home_alarm",
    state: "disarmed",
    device: "alarm",
    attributes: {
      friendly_name: "Home alarm",
      code_format: "number",
      code_arm_required: false,
      changed_by: "Alex",
      // Arm home, arm away, arm night, and trigger
      supported_features: 15,
    },
  },
  {
    entity_id: "event.doorbell",
    state: fromNow(-2 * HOUR),
    device: "doorbell",
    attributes: {
      friendly_name: "Doorbell",
      device_class: "doorbell",
      event_type: "ring",
      event_types: ["ring"],
    },
  },

  // Garage
  {
    entity_id: "cover.garage_door",
    state: "closed",
    device: "garage_door",
    attributes: {
      friendly_name: "Garage door",
      device_class: "garage",
      // Open, close, and stop
      supported_features: 11,
    },
  },
  {
    entity_id: "water_heater.water_heater",
    state: "eco",
    device: "water_heater",
    attributes: {
      friendly_name: "Water heater",
      current_temperature: 52,
      temperature: 55,
      min_temp: 40,
      max_temp: 65,
      target_temp_step: 1,
      operation_mode: "eco",
      operation_list: ["off", "eco", "electric", "heat_pump", "performance"],
      away_mode: "off",
      // Target temperature, operation mode, away mode, and on/off
      supported_features: 15,
    },
  },

  // Bedroom
  {
    entity_id: "cover.bedroom_blinds",
    state: "open",
    device: "blinds",
    attributes: {
      friendly_name: "Bedroom blinds",
      current_position: 70,
      device_class: "blind",
      // Open, close, set position, and stop
      supported_features: 15,
    },
  },
  {
    entity_id: "fan.bedroom_fan",
    state: "on",
    device: "bedroom_fan",
    attributes: {
      friendly_name: "Bedroom fan",
      percentage: 40,
      percentage_step: 10,
      oscillating: true,
      preset_mode: null,
      preset_modes: ["auto", "sleep"],
      // Set speed, oscillate, preset mode, turn off, and turn on
      supported_features: 59,
    },
  },
  {
    entity_id: "humidifier.bedroom_humidifier",
    state: "on",
    device: "humidifier",
    attributes: {
      friendly_name: "Bedroom humidifier",
      device_class: "humidifier",
      humidity: 45,
      current_humidity: 38,
      min_humidity: 30,
      max_humidity: 80,
      mode: "normal",
      available_modes: ["normal", "eco", "sleep", "boost"],
      // Modes
      supported_features: 1,
    },
  },
  {
    entity_id: "climate.bedroom_air_conditioner",
    state: "off",
    device: "air_conditioner",
    attributes: {
      friendly_name: "Bedroom air conditioner",
      current_temperature: 22.5,
      temperature: 20,
      min_temp: 16,
      max_temp: 30,
      target_temp_step: 0.5,
      hvac_modes: ["off", "cool", "heat", "dry", "fan_only"],
      hvac_action: "off",
      fan_mode: "auto",
      fan_modes: ["auto", "low", "medium", "high"],
      swing_mode: "off",
      swing_modes: ["off", "vertical"],
      // Target temperature, fan mode, swing mode, turn off, and turn on
      supported_features: 425,
    },
  },

  // Bathroom
  {
    entity_id: "binary_sensor.bathroom_leak",
    state: "off",
    device: "leak_sensor",
    attributes: { friendly_name: "Bathroom leak", device_class: "moisture" },
  },

  // Office
  {
    entity_id: "switch.desk_plug",
    state: "on",
    device: "desk_plug",
    attributes: { friendly_name: "Desk plug" },
  },
  {
    entity_id: "sensor.desk_plug_power",
    state: "64.3",
    device: "desk_plug",
    attributes: {
      friendly_name: "Desk plug power",
      unit_of_measurement: "W",
      device_class: "power",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.desk_plug_energy",
    state: "12.84",
    device: "desk_plug",
    attributes: {
      friendly_name: "Desk plug energy",
      unit_of_measurement: "kWh",
      device_class: "energy",
      state_class: "total_increasing",
    },
  },
  {
    entity_id: "update.desk_plug_firmware",
    state: "off",
    device: "desk_plug",
    attributes: {
      friendly_name: "Desk plug firmware",
      device_class: "firmware",
      title: "Shelly firmware",
      installed_version: "1.4.4",
      latest_version: "1.4.4",
      skipped_version: null,
      in_progress: false,
      update_percentage: null,
      auto_update: false,
      release_url: null,
      release_summary: null,
      // Install and progress
      supported_features: 5,
    },
  },

  // Garden
  {
    entity_id: "sensor.outdoor_temperature",
    state: "12.4",
    device: "weather_station",
    attributes: {
      friendly_name: "Outdoor temperature",
      unit_of_measurement: "°C",
      device_class: "temperature",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.outdoor_humidity",
    state: "76",
    device: "weather_station",
    attributes: {
      friendly_name: "Outdoor humidity",
      unit_of_measurement: "%",
      device_class: "humidity",
      state_class: "measurement",
    },
  },
  {
    entity_id: "lawn_mower.lawn_mower",
    state: "docked",
    device: "lawn_mower",
    attributes: {
      friendly_name: "Lawn mower",
      // Start mowing, pause, dock, and stop
      supported_features: 15,
    },
  },
  {
    entity_id: "valve.garden_irrigation",
    state: "closed",
    device: "irrigation",
    attributes: {
      friendly_name: "Garden irrigation",
      device_class: "water",
      // Open and close
      supported_features: 3,
    },
  },

  // Weather, from a weather service: it has no device or area.
  {
    entity_id: "weather.home",
    state: "partlycloudy",
    attributes: {
      friendly_name: "Home",
      temperature: 12.4,
      apparent_temperature: 10.8,
      dew_point: 8.3,
      humidity: 76,
      pressure: 1014,
      wind_speed: 14.4,
      wind_gust_speed: 25.2,
      wind_bearing: 225,
      cloud_coverage: 60,
      uv_index: 2,
      visibility: 10,
      temperature_unit: "°C",
      pressure_unit: "hPa",
      wind_speed_unit: "km/h",
      visibility_unit: "km",
      precipitation_unit: "mm",
      attribution: "Weather forecast from met.no",
      // Daily and hourly forecasts
      supported_features: 3,
    },
  },

  // People, their phones, and the zones they are in
  {
    entity_id: "person.alex",
    state: "home",
    attributes: {
      friendly_name: "Alex",
      latitude: 52.3731,
      longitude: 4.8903,
      gps_accuracy: 12,
      source: "device_tracker.alex_phone",
      user_id: "abcd",
      device_trackers: ["device_tracker.alex_phone"],
    },
  },
  {
    entity_id: "device_tracker.alex_phone",
    state: "home",
    device: "alex_phone",
    attributes: {
      friendly_name: "Alex's phone",
      source_type: "gps",
      latitude: 52.3731,
      longitude: 4.8903,
      gps_accuracy: 12,
      battery_level: 54,
    },
  },
  {
    entity_id: "sensor.alex_phone_battery",
    state: "54",
    device: "alex_phone",
    attributes: {
      friendly_name: "Alex's phone battery",
      unit_of_measurement: "%",
      device_class: "battery",
      state_class: "measurement",
    },
  },
  {
    // Sam has no device tracker in the home, so the person entity knows
    // where Sam is, but there is nothing to link to.
    entity_id: "person.sam",
    state: "Work",
    attributes: {
      friendly_name: "Sam",
      latitude: 52.3909,
      longitude: 4.8531,
      gps_accuracy: 20,
      device_trackers: [],
    },
  },
  {
    entity_id: "zone.home",
    state: "1",
    attributes: {
      friendly_name: "Home",
      icon: "mdi:home",
      latitude: 52.3731339,
      longitude: 4.8903147,
      radius: 100,
      passive: false,
      persons: ["person.alex"],
    },
  },
  {
    entity_id: "zone.work",
    state: "1",
    attributes: {
      friendly_name: "Work",
      icon: "mdi:briefcase",
      latitude: 52.3909184,
      longitude: 4.8530821,
      radius: 200,
      passive: false,
      persons: ["person.sam"],
    },
  },

  // Helpers, scenes, and lists: they belong to no device.
  {
    entity_id: "input_boolean.guest_mode",
    state: "off",
    attributes: { friendly_name: "Guest mode", icon: "mdi:account-multiple", editable: true },
  },
  {
    entity_id: "input_number.comfort_temperature",
    state: "21",
    attributes: {
      friendly_name: "Comfort temperature",
      min: 15,
      max: 25,
      step: 0.5,
      mode: "slider",
      unit_of_measurement: "°C",
      icon: "mdi:thermometer",
      editable: true,
    },
  },
  {
    entity_id: "input_number.vacation_days",
    state: "14",
    attributes: {
      friendly_name: "Vacation days left",
      min: 0,
      max: 40,
      step: 1,
      mode: "box",
      unit_of_measurement: "days",
      icon: "mdi:palm-tree",
      editable: true,
    },
  },
  {
    entity_id: "input_text.welcome_message",
    state: "Welcome home!",
    attributes: {
      friendly_name: "Welcome message",
      min: 0,
      max: 100,
      mode: "text",
      pattern: null,
      icon: "mdi:message-text",
      editable: true,
    },
  },
  {
    entity_id: "input_select.house_mode",
    state: "Home",
    attributes: {
      friendly_name: "House mode",
      options: ["Home", "Away", "Night", "Vacation"],
      icon: "mdi:home-switch",
      editable: true,
    },
  },
  {
    entity_id: "input_datetime.wake_up_time",
    state: "07:00:00",
    attributes: {
      friendly_name: "Wake-up time",
      has_date: false,
      has_time: true,
      hour: 7,
      minute: 0,
      second: 0,
      timestamp: 7 * 3600,
      icon: "mdi:alarm",
      editable: true,
    },
  },
  {
    entity_id: "timer.laundry",
    state: "active",
    attributes: {
      friendly_name: "Laundry",
      duration: "1:30:00",
      remaining: "1:30:00",
      finishes_at: fromNow(23 * MINUTE),
      icon: "mdi:washing-machine",
      editable: true,
    },
  },
  {
    entity_id: "timer.tea",
    state: "idle",
    attributes: {
      friendly_name: "Tea",
      duration: "0:04:00",
      icon: "mdi:tea",
      editable: true,
    },
  },
  {
    entity_id: "scene.movie_night",
    state: fromNow(-1 * HOUR),
    attributes: {
      friendly_name: "Movie night",
      icon: "mdi:movie-open",
      entity_id: ["light.living_room_lamp", "media_player.living_room_tv"],
    },
  },
  {
    entity_id: "scene.good_night",
    state: "unknown",
    attributes: {
      friendly_name: "Good night",
      icon: "mdi:weather-night",
      entity_id: ["light.living_room_lamp", "light.hallway", "lock.front_door"],
    },
  },
  {
    // The number of items still to do. The items themselves come from the
    // todo mock in ha-demo-hass.ts.
    entity_id: "todo.shopping_list",
    state: "2",
    attributes: {
      friendly_name: "Shopping list",
      // Create, delete, update, and move items
      supported_features: 15,
    },
  },
  {
    entity_id: "update.home_assistant_core",
    state: "on",
    attributes: {
      friendly_name: "Home Assistant Core update",
      title: "Home Assistant Core",
      installed_version: "2026.9.3",
      latest_version: "2026.10.1",
      skipped_version: null,
      in_progress: false,
      update_percentage: null,
      auto_update: false,
      release_url: "https://www.home-assistant.io/blog/",
      release_summary: "Bug fixes for the 2026.10 release.",
      entity_picture: "https://brands.home-assistant.io/_/homeassistant/icon.png",
      // Install, progress, and release notes
      supported_features: 21,
    },
  },
  {
    entity_id: "sun.sun",
    state: "above_horizon",
    attributes: {
      friendly_name: "Sun",
      next_dawn: fromNow(14 * HOUR),
      next_rising: fromNow(14.5 * HOUR),
      next_noon: fromNow(19 * HOUR),
      next_setting: fromNow(3 * HOUR),
      next_dusk: fromNow(3.5 * HOUR),
      next_midnight: fromNow(7 * HOUR),
      elevation: 24.6,
      azimuth: 212.3,
      rising: false,
    },
  },
];

export const ENTITIES = ENTITY_LIST.map(({ device, area, ...entity }) => ({
  ...entity,
  device_id: device,
  area_id: area,
}));

// Core names the entity of a device after what it is, like "Battery", and
// its friendly name puts the device name in front: "Front door battery". An
// entity that is the device itself, like a lamp, has no name of its own and
// goes by the name of its device.
function ownName(entity: (typeof ENTITY_LIST)[number]) {
  const fullName = entity.attributes.friendly_name;
  const owner = DEVICES.find((item) => item.id === entity.device);

  if (!owner) {
    return fullName;
  }

  if (fullName === owner.name) {
    return undefined;
  }

  if (owner.name && fullName.startsWith(`${owner.name} `)) {
    const rest = fullName.slice(owner.name.length + 1);
    return rest[0].toUpperCase() + rest.slice(1);
  }

  return fullName;
}

// The names of the entities as the display registry has them, by entity ID.
export const ENTITY_NAMES = Object.fromEntries(
  ENTITY_LIST.map((entity) => [entity.entity_id, ownName(entity)]),
);

export const ENTITY_REGISTRY = ENTITY_LIST.map((entity): EntityRegistryEntry => {
  const [platform] = entity.entity_id.split(".");
  const owner = DEVICES.find((item) => item.id === entity.device);

  return {
    entity_id: entity.entity_id,
    unique_id: entity.entity_id,
    platform: owner ? "demo" : platform,
    config_entry_id: owner ? "config_entry_demo" : null,
    config_subentry_id: null,
    device_id: owner?.id ?? null,
    area_id: entity.area ?? null,
    disabled_by: null,
    hidden_by: null,
    entity_category: null,
    has_entity_name: Boolean(owner),
    original_name: owner ? ownName(entity) : undefined,
    id: entity.entity_id,
    name: null,
    icon: null,
    labels: [],
    categories: {},
    options: null,
    created_at: now,
    modified_at: now,
  };
});

// The forecast of weather.home, for the forecast cards and the more-info
// view. Daily for a week, hourly for the next day.
const FORECAST_CONDITIONS = [
  "partlycloudy",
  "rainy",
  "cloudy",
  "sunny",
  "sunny",
  "partlycloudy",
  "pouring",
];
const DAILY_HIGHS = [14, 12, 13, 17, 18, 15, 11];

export function weatherForecast(type: "daily" | "hourly") {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (type === "daily") {
    return FORECAST_CONDITIONS.map((condition, day) => {
      const isRaining = condition === "rainy" || condition === "pouring";

      return {
        datetime: new Date(today.getTime() + day * 24 * HOUR).toISOString(),
        condition,
        temperature: DAILY_HIGHS[day],
        templow: DAILY_HIGHS[day] - 6,
        precipitation: isRaining ? 4.2 : 0,
        precipitation_probability: isRaining ? 80 : 10,
        humidity: 70,
        wind_speed: 12 + day,
        wind_bearing: 225,
      };
    });
  }

  const thisHour = new Date();
  thisHour.setMinutes(0, 0, 0);

  // A shower a few hours from now, so the hourly forecast has some rain in it.
  return Array.from({ length: 24 }, (_, hour) => {
    const time = new Date(thisHour.getTime() + hour * HOUR);
    const isDaytime = time.getHours() >= 7 && time.getHours() < 19;
    const isRaining = hour >= 5 && hour <= 7;

    let condition = isDaytime ? "partlycloudy" : "clear-night";
    if (isRaining) {
      condition = "rainy";
    }

    return {
      datetime: time.toISOString(),
      condition,
      temperature: isDaytime ? 12 + (hour % 4) : 8,
      precipitation: isRaining ? 0.8 : 0,
      precipitation_probability: isRaining ? 70 : 5,
      is_daytime: isDaytime,
      wind_speed: 14,
      wind_bearing: 225,
    };
  });
}

// What update entities answer when the more-info view asks for the release
// notes. Markdown, like the real ones.
export const RELEASE_NOTES: Record<string, string> = {
  "update.home_assistant_core": [
    "## Home Assistant 2026.10.1",
    "",
    "A patch release with fixes for issues found in 2026.10.0.",
    "",
    "- Fix the lock card showing the wrong state after a restart.",
    "- Fix forecasts of some weather services being off by one day.",
    "- Update the frontend to the latest version.",
  ].join("\n"),
};
