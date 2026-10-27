// <ha-demo-hass> gives the components inside it a Home Assistant to talk
// to: the fake home from demo-home.ts, with its registries, translations,
// and the contexts the real app provides.
//
// It uses provideHass, the same fake backend the frontend gallery uses.
// Imports starting with "frontend/" point into the frontend source, see
// scripts/build-components.ts.

import { mockAreaRegistry } from "frontend/demo/src/stubs/area_registry";
import { mockConfigEntries } from "frontend/demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "frontend/demo/src/stubs/device_registry";
import { mockEntityRegistry } from "frontend/demo/src/stubs/entity_registry";
import { mockFloorRegistry } from "frontend/demo/src/stubs/floor_registry";
import { mockIcons } from "frontend/demo/src/stubs/icons";
import { mockHistory } from "frontend/demo/src/stubs/history";
import { mockLabelRegistry } from "frontend/demo/src/stubs/label_registry";
import { mockMediaPlayer } from "frontend/demo/src/stubs/media_player";
import { mockRecorder } from "frontend/demo/src/stubs/recorder";
import { mockTemplate } from "frontend/demo/src/stubs/template";
import { mockTodo } from "frontend/demo/src/stubs/todo";
import { MockBaseEntity } from "frontend/src/fake_data/entities/base-entity";
import type { MockHomeAssistant } from "frontend/src/fake_data/provide_hass";
import { provideHass } from "frontend/src/fake_data/provide_hass";
import { css, html, LitElement } from "lit";
import {
  AREAS,
  DEVICES,
  ENTITIES,
  ENTITY_NAMES,
  ENTITY_REGISTRY,
  FLOORS,
  LABELS,
  RELEASE_NOTES,
  weatherForecast,
} from "./demo-home";

// The mock entities of the frontend only put the attributes they know about
// in their state, and drop the rest. Domains without a mock of their own,
// like weather, timer, and update, would lose every attribute that makes
// them worth showing. So the state keeps all attributes from the demo home.
// What a mock works out itself still wins, like a light that is off having
// no brightness.
const mockedState = MockBaseEntity.prototype.toState;

MockBaseEntity.prototype.toState = function stateWithAllAttributes(this: MockBaseEntity) {
  const state = mockedState.call(this);
  return { ...state, attributes: { ...this.attributes, ...state.attributes } };
};

const asList = (value?: string | string[]): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

// What the backend answers to `extract_from_target`: which areas, devices,
// and entities a target refers to, worked out from the fake home.
function extractFromTarget(target: Record<string, string | string[]> = {}) {
  const floors = asList(target.floor_id);
  const labels = asList(target.label_id);

  const areas = new Set([
    ...asList(target.area_id),
    ...AREAS.filter((area) => area.floor_id && floors.includes(area.floor_id)).map(
      (area) => area.area_id,
    ),
  ]);

  const devices = new Set([
    ...asList(target.device_id),
    ...DEVICES.filter((device) => device.area_id && areas.has(device.area_id)).map(
      (device) => device.id,
    ),
  ]);

  // Entities of a device in the target, and entities without a device that
  // are in one of the areas themselves, like a plant.
  const entities = new Set([
    ...asList(target.entity_id),
    ...ENTITY_REGISTRY.filter(
      (entry) =>
        (entry.device_id && devices.has(entry.device_id)) ||
        (entry.area_id && areas.has(entry.area_id)),
    ).map((entry) => entry.entity_id),
  ]);

  return {
    referenced_areas: [...areas],
    referenced_devices: [...devices],
    referenced_entities: [...entities],
    missing_areas: [],
    missing_devices: [],
    missing_floors: floors.filter((id) => !FLOORS.some((floor) => floor.floor_id === id)),
    missing_labels: labels.filter((id) => !LABELS.some((label) => label.label_id === id)),
  };
}

// The site has a light and a dark mode of its own: `data-theme` on <html>
// when the visitor picked one, the system setting otherwise. The theme CSS of
// a demo follows it (see scripts/build-components.ts). Some components also
// look at `darkMode` in hass, like the map for its tiles, so that follows the
// site too, also when the visitor switches.
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function siteIsDark() {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || (theme !== "light" && systemDark.matches);
}

const connectedHomes = new Set<HaDemoHass>();

function syncDarkMode(home: HaDemoHass) {
  const hass = home.hass;
  const darkMode = siteIsDark();
  if (!hass || hass.themes.darkMode === darkMode) {
    return;
  }

  hass.updateHass({
    themes: { ...hass.themes, darkMode },
    selectedTheme: { theme: "default", ...hass.selectedTheme, dark: darkMode },
  });
}

const syncAllHomes = () => connectedHomes.forEach(syncDarkMode);
new MutationObserver(syncAllHomes).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});
systemDark.addEventListener("change", syncAllHomes);

class HaDemoHass extends LitElement {
  static properties = {
    hass: { attribute: false },
  };

  declare hass?: MockHomeAssistant;

  static styles = css`
    :host {
      display: contents;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    connectedHomes.add(this);
    if (this.hass) {
      return;
    }

    // Every component inside gets `hass`, and the updates when the fake state
    // changes. This runs before the components themselves are loaded: Lit
    // keeps the property, so they have it on their first render.
    const consumers = [...this.querySelectorAll("*")].filter((element) =>
      element.localName.includes("-"),
    );
    const hass = provideHass([this, ...consumers]);

    // The map asks the connection where Home Assistant is, to load its
    // tiles from there. There are no tiles to load here, but without an
    // answer the map fails to start at all.
    Object.assign(hass.connection, { options: { auth: hass.auth } });

    hass.addEntities(ENTITIES);

    // addEntities gives every entity its friendly name in the display
    // registry. Core gives an entity of a device only its own name, and says
    // the device name goes in front of it. Without that, pickers show
    // "Energy" without saying of what, and cards that show the device next
    // to the entity say "Floor lamp Floor lamp".
    const entities = this.hass!.entities;
    hass.updateHass({
      entities: Object.fromEntries(
        Object.entries(entities).map(([entityId, entry]) => [
          entityId,
          entry.device_id
            ? { ...entry, name: ENTITY_NAMES[entityId], has_entity_name: true, next_name_part: "device" }
            : entry,
        ]),
      ),
    });
    mockEntityRegistry(hass, ENTITY_REGISTRY);
    mockDeviceRegistry(hass, DEVICES);
    mockAreaRegistry(hass, AREAS);
    mockFloorRegistry(hass, FLOORS);
    mockLabelRegistry(hass, LABELS);
    mockConfigEntries(hass);
    // Icons per domain, device class, and state, like a battery icon for a
    // battery sensor.
    mockIcons(hass);
    hass.mockWS("extract_from_target", (message) => extractFromTarget(message.target));

    // The entity registry stub answers for many entities at once, some cards
    // ask for one.
    hass.mockWS("config/entity_registry/get", (message) => {
      const entry = ENTITY_REGISTRY.find((item) => item.entity_id === message.entity_id);
      if (!entry) {
        throw new Error(`Entity not found: ${message.entity_id}`);
      }

      return { ...entry, capabilities: {}, aliases: [] };
    });

    // What cards and more-info views ask the backend for. The stubs of the
    // frontend demo cover most of it: made up history for graphs, the items
    // of the shopping list, and templates rendered as they are.
    mockHistory(hass);
    mockRecorder(hass);
    mockTodo(hass);
    mockTemplate(hass);
    mockMediaPlayer(hass);
    hass.mockWS("weather/subscribe_forecast", (message, _hass, onChange) => {
      onChange?.({
        type: message.forecast_type,
        forecast: weatherForecast(message.forecast_type),
      });
      return () => undefined;
    });
    hass.mockWS("update/release_notes", (message) => RELEASE_NOTES[message.entity_id] ?? null);

    syncDarkMode(this);
    this._loadTranslations(hass);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    connectedHomes.delete(this);
  }

  // One after the other, on purpose. Each load recomputes how states are
  // formatted, and loads that finish out of order would leave an older,
  // less complete version in place.
  private async _loadTranslations(hass: MockHomeAssistant) {
    for (const fragment of [null, "config", "lovelace"]) {
      await hass.updateTranslations(fragment, "en");
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

customElements.define("ha-demo-hass", HaDemoHass);
