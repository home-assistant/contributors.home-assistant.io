// <ha-demo-more-info entity="light.living_room_lamp"> shows the more-info
// content of an entity from the fake home, the way the more-info dialog shows
// it. Use it inside <Demo hass>.
//
// Imports starting with "frontend/" point into the frontend source, see
// scripts/build-components.ts.

import "frontend/src/components/ha-card";
import { computeShowNewMoreInfo } from "frontend/src/dialogs/more-info/const";
import "frontend/src/dialogs/more-info/more-info-content";
import "frontend/src/state-summary/state-card-content";
import type { HomeAssistant } from "frontend/src/types";
import { css, html, LitElement, nothing } from "lit";

class HaDemoMoreInfo extends LitElement {
  static properties = {
    hass: { attribute: false },
    entity: {},
  };

  declare hass?: HomeAssistant;

  declare entity?: string;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 420px;
    }

    ha-card {
      padding: 16px;
    }

    state-card-content {
      display: block;
      margin-bottom: 16px;
    }
  `;

  render() {
    const stateObj = this.entity ? this.hass?.states[this.entity] : undefined;
    if (!stateObj) {
      return nothing;
    }

    // Domains without the newer more-info design, like input_number, have
    // their controls in the state row at the top of the dialog. Show it, or
    // their more-info view is empty.
    return html`
      <ha-card>
        ${computeShowNewMoreInfo(stateObj)
          ? nothing
          : html`<state-card-content
              .hass=${this.hass}
              .stateObj=${stateObj}
              in-dialog
            ></state-card-content>`}
        <more-info-content .hass=${this.hass} .stateObj=${stateObj}></more-info-content>
      </ha-card>
    `;
  }
}

customElements.define("ha-demo-more-info", HaDemoMoreInfo);
