---
title: Android end-to-end tests
description: The nightly Maestro tests that run the Android app against a real Home Assistant on every API level, and how to debug a failure.
sidebarLabel: End-to-end tests
sidebarGroup: Test
order: 4
source: https://github.com/home-assistant/android/blob/main/.github/workflows/e2e.yml
lastVerified: 2026-11-05
---

All other tests fake the server. The end-to-end (E2E) tests don't: they run the real app against a real Home Assistant, the way a user does. That catches what nothing else can, like a change in Core or the frontend that breaks onboarding, or a web view problem on one specific Android version.

There are two: one onboards over plain HTTP, the other through a proxy that requires a client certificate, known as mutual TLS (mTLS).

## When it runs

The `e2e.yml` workflow runs:

- Every night at 05:00 UTC on `main`, against the `dev` image of Home Assistant, the latest development build.
- Manually, on any branch, through **Run workflow**. The optional `home-assistant-version` input picks the image tag to test against.

It is not part of the pull request checks. It starts an emulator for every supported API level, which is too expensive for every pull request.

## What it does

1. Generates the certificates for the mTLS test. They only exist for the run.
2. Builds the `fullDebug` APK, with [StrictMode](/companion/android/debugging/#strictmode) off, and with the certificate authority (CA) of the run trusted.
3. Installs the [Maestro](https://maestro.dev/) CLI, and checks the download against its published checksum.
4. Starts Home Assistant from the configuration in `.github/e2e/homeassistant`, and checks that `mobile_app` is loaded.
5. Starts the mTLS proxy in front of Home Assistant, and checks that it refuses a request without the client certificate.
6. Starts one emulator per API level on Emulator.wtf, from API 29 to `androidSdk-target`, and installs the app.
7. Runs the plain flow on all emulators in parallel.
8. Opens the certificate installer on the emulators, and runs the mTLS flow. This only happens when the plain flow passed.
9. Uploads the files you need to debug, whatever the result.

The device list starts at API 29, even though the app supports older versions. On older images, the web view renders the frontend, but its content never shows up in what Maestro can see, so every check on it fails. The [instrumentation tests](/companion/android/instrumentation-testing/) on pull requests still cover the full range, down to the minimum API level of the app.

The Home Assistant container and the proxy run on the GitHub runner, and the emulators on Emulator.wtf. A tunnel connects them, and inside the emulators `homeassistant.internal` resolves to the runner: port 8123 is Home Assistant, and port 8443 the proxy.

## How the mTLS test works

The proxy in `.github/e2e/mtls` is nginx in front of Home Assistant. It refuses every request without the client certificate, from the first page of onboarding on.

Its server certificate is signed by a CA that only exists for the run. To make the app trust it, the workflow builds with the Gradle property `debugExtraResDir`. That replaces the network security config of the app with the copy in `.github/e2e/mtls`, which trusts that CA in a debuggable build. A build without the property is unchanged.

The client certificate is installed the way a user does it: the workflow opens the system certificate installer, and the flow goes through it.

> [!IMPORTANT]
> `.github/e2e/mtls/network_security_config.xml` is a copy of `app/src/main/res/xml/network_security_config.xml` with one section added. When you change the config of the app, make the same change in the copy.

## The flows

The flows live in the `.maestro` folder at the root of the repository, and every step of the tests is written there:

- [`.maestro/onboarding.yaml`](https://github.com/home-assistant/android/blob/main/.maestro/onboarding.yaml) onboards over plain HTTP.
- [`.maestro/onboarding-mtls.yaml`](https://github.com/home-assistant/android/blob/main/.maestro/onboarding-mtls.yaml) installs the client certificate, then onboards through the proxy.

They share their steps through `.maestro/subflows`, and cover the most critical path of the app:

- **Login**: the real login page, with real credentials, through the whole authorization flow.
- **Registration**: the app registers itself with `mobile_app`, which everything else depends on.
- **The frontend renders**: reaching the overview dashboard proves the web view works on that API level.
- **The external bus works both ways**: the frontend only shows the **Companion app** entry in its settings after the app announced itself over the [external bus](/frontend/reference/external-bus/), and selecting it makes the frontend ask the app to open its native settings.
- **The client certificate**, in the mTLS flow: the web view and the app itself both present it.

The flows take the instance to test against from three parameters: `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_USERNAME`, and `HOME_ASSISTANT_PASSWORD`. The mTLS flow takes two more, `MTLS_P12_PASSWORD` and `MTLS_CERT_ALIAS`: the password of the certificate file, and the name to give the certificate.

When you change a flow:

- It drives the debug app, `io.homeassistant.companion.android.debug`. Don't change the `appId`.
- It runs on every API level, so anything version specific must be conditional, like the existing steps for permission dialogs.
- Steps match on text on screen. If you rename a label in the app, update the flow in the same pull request.
- Put a step that both flows need in a subflow.

The [Maestro documentation](https://docs.maestro.dev/api-reference/commands) lists all commands.

## Run it locally

Install the [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro), start an emulator or connect a device, and run:

```bash
./gradlew :app:installFullDebug
maestro test \
  -e HOME_ASSISTANT_URL=http://homeassistant.local:8123 \
  -e HOME_ASSISTANT_USERNAME=<username> \
  -e HOME_ASSISTANT_PASSWORD=<password> \
  .maestro/onboarding.yaml
```

The flow clears the app state first, so it always starts from a fresh onboarding. Use a throwaway instance: every run registers a new device on it.

### Run the mTLS flow

You also need Docker, and Home Assistant on port 8123 of your machine. From the emulator, your machine is `10.0.2.2`.

1. Generate the certificates, with that address in the server certificate:

   ```bash
   OUT=/tmp/mtls
   .github/e2e/mtls/generate-certs.sh "$OUT" \
     "DNS:homeassistant.internal,IP:10.0.2.2"
   ```

2. Start the proxy. With Docker Desktop, `host.docker.internal` is your machine:

   ```bash
   TEMPLATE=/etc/nginx/templates/default.conf.template
   docker run -d --name e2e-mtls-proxy -p 8443:8443 \
     -e E2E_MTLS_UPSTREAM=host.docker.internal:8123 \
     -v "$OUT:/etc/nginx/certs:ro" \
     -v "$PWD/.github/e2e/mtls/nginx.conf.template:$TEMPLATE:ro" \
     nginx:stable-alpine
   ```

3. Install the app, built to trust the CA:

   ```bash
   ./gradlew :app:installFullDebug -PdebugExtraResDir="$OUT/res"
   ```

4. Open the certificate installer on the emulator:

   ```bash
   .github/e2e/mtls/open-cert-installer.sh emulator-5554 "$OUT/client.p12"
   ```

5. Run the flow, with the default password and name of `generate-certs.sh`:

   ```bash
   maestro test \
     -e HOME_ASSISTANT_URL=https://10.0.2.2:8443 \
     -e HOME_ASSISTANT_USERNAME=<username> \
     -e HOME_ASSISTANT_PASSWORD=<password> \
     -e MTLS_P12_PASSWORD=e2ep12pass \
     -e MTLS_CERT_ALIAS=e2eclient \
     .maestro/onboarding-mtls.yaml
   ```

## Debug a failure

Every run uploads an `e2e-artifacts` artifact:

| File | Content |
| --- | --- |
| `maestro-results/` | The command trace per flow and shard, `maestro.log`, and screenshots of failures |
| `logcat-*.txt` | The full logcat, one file per emulator |
| `mtls-proxy.log` | The log of the mTLS proxy, one line per request |
| `homeassistant.log` | The Home Assistant log |
| `homeassistant-config.json` | The `/api/config` response, with the version and loaded components |
| `homeassistant-container.json` | The container details, including the exact image |

Read them in that order, and stop at the first one that explains the failure. Most failures show in the failing Maestro command and its screenshot: that tells a broken screen apart from an element Maestro just couldn't see. Starting with the Home Assistant log usually wastes time. In the proxy log, a `400` is a request without the client certificate.

Only look upstream once the app and the flow are ruled out. The `dev` image changes every night, so compare with the last run that passed: the two `homeassistant-config.json` files give the Home Assistant versions on both sides of the break. Then look at what landed in [Core](https://github.com/home-assistant/core) or the [frontend](https://github.com/home-assistant/frontend) in between.

## Automated triage

A failing nightly run starts an `e2e-triage` workflow. An AI agent downloads the artifacts of the failed run and of the last good one, and follows the procedure in the `.agents/skills/ha-android-e2e-debugging` skill. It only diagnoses: it never changes files or opens pull requests. It reports in a single `e2e-failure` issue in the Android repository, including upstream findings for a maintainer to take to Core or the frontend. The next passing run closes the issue.
