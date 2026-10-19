---
title: Secure your app
description: Keep your app and the system it runs on safe. Ask for as little as possible, add an AppArmor profile, pick the right API role, and use Home Assistant for logins.
order: 9
---

Your app runs on someone's home, next to their cameras, locks, and alarm. Users trust you with that. The Supervisor helps by keeping apps contained, and by showing users a [security rating](/apps/reference/security-rating/) of your app. This guide covers what you can do to keep that rating high and the risks low.

## Ask for as little as possible

The most effective step costs nothing: only ask for the access your app needs.

- Do not run on the host network unless you have to.
- Map folders read-only, unless your app writes to them.
- Prefer a `device` option or `devices` over `uart`, `usb`, or `full_access`.
- Only add the capabilities in `privileged` that your software really uses.
- Only ask for the API access you call, with the lowest role that works.
- Use ingress for your web interface, instead of exposing a port.

## Protection mode

Every app runs with **Protection mode** on by default. With it on, the Supervisor does not grant `full_access`, `docker_api`, or `host_pid`, even if your `config.yaml` asks for them. The user turns protection mode off on the app page, and the UI warns them when they do. Through the Supervisor API, only a caller with the `admin` role can change it. That includes an app with `hassio_api: true` and `hassio_role: admin`, for itself or for any other app.

If your app needs it off, say so in your documentation, and explain why.

## AppArmor

AppArmor limits what the processes in your container can do: which files they can read and write, which programs they can run, and which signals they can send. Every app runs with the default AppArmor profile of Docker, unless you set `apparmor: false` (which lowers the rating).

Put an `apparmor.txt` in your app folder, and the Supervisor loads it as the profile of your app instead. A profile fitted to your app is a strong second line of defense: even if an attacker finds a hole in your software, they can only do what the profile allows. It also raises the security rating.

The file must hold exactly one top-level `profile` line. The Supervisor replaces the name on that line with the ID of your app, like `local_example`, when it loads the profile, so use the slug of your app as the name. This example is for an app with the slug `example` that runs `/usr/bin/my_program` with S6 overlay. The rules for `/etc/services.d`, `/etc/cont-init.d`, and `/etc/cont-finish.d` cover the legacy service format, and the rule for `/etc/s6-overlay` covers the [s6-rc format](/apps/guides/s6-overlay/#the-s6-rc-layout). That rule includes write access: if your app keeps its `user` bundle in `s6-rc.d` instead of `user-bundles.d`, S6 overlay writes to that folder at startup.

```text
#include <tunables/global>

profile example flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  # Capabilities
  file,
  signal (send) set=(kill,term,int,hup,cont),

  # S6 overlay
  /init ix,
  /bin/** ix,
  /usr/bin/** ix,
  /run/{s6,s6-rc*,service}/** ix,
  /package/** ix,
  /command/** ix,
  /etc/services.d/** rwix,
  /etc/cont-init.d/** rwix,
  /etc/cont-finish.d/** rwix,
  /etc/s6-overlay/** rwix,
  /run/{,**} rwk,
  /dev/tty rw,

  # Bashio
  /usr/lib/bashio/** ix,
  /tmp/** rwk,

  # Options and other files of the app
  /data/** rw,

  # Run the program in its own, stricter profile
  /usr/bin/my_program cx -> my_program,

  profile my_program flags=(attach_disconnected,mediate_deleted) {
    #include <abstractions/base>

    # Receive signals from S6 overlay
    signal (receive) peer=*_example,

    # Files the program needs
    /data/** rw,
    /share/** rw,
    /usr/bin/my_program r,
    /bin/bash rix,
    /bin/echo ix,
    /etc/passwd r,
    /dev/tty rw,
  }
}
```

To write a profile for your own app:

1. Start from the example. The S6 overlay part is the same for every app that uses the base images; add to it if your startup scripts need more, but do not remove anything.
2. If the software you package ships an AppArmor profile, use that one for its process. A profile by the developers of the software is better than one you guess.
3. Otherwise, add the access you know the software needs, and add `complain` to the flags of the profile.
4. Run the app and use every feature. In complain mode, AppArmor logs what it would block, instead of blocking it. Read the log on the host with `journalctl _TRANSPORT="audit" -g 'apparmor="ALLOWED"'`.
5. Add what is missing, until using the app logs no more warnings.
6. Remove `complain`, so AppArmor blocks everything else.

Repeat this when you update the software, as a new version may need new access.

## API roles

With `hassio_api: true`, your app can call the Supervisor API beyond the basic endpoints. `hassio_role` decides how far:

| Role | Can call |
| --- | --- |
| `default` | Every `info` endpoint, like `/supervisor/info` or `/addons/<app>/info` |
| `homeassistant` | The above, and all `/core` endpoints |
| `backup` | The above `info` endpoints, and all `/backups` endpoints |
| `manager` | Most of the API: apps, the store, backups, Core, the host, the OS, and the plugins. Not the security settings of apps, wiping the data disk, or the SSH keys of the host |
| `admin` | Everything, including the protection mode of any app, its own too |

`manager` and `admin` lower the security rating, by 1 and 2. They are meant for apps that manage the system, like a terminal or a dashboard for the Supervisor.

Without `hassio_api`, your app can still use most of its own `/addons/self` endpoints (not `security` or `update`), `/info`, services, discovery, and authentication. See [Talk to Home Assistant and the Supervisor](/apps/guides/communication/#the-supervisor-api).

`homeassistant_api` is separate from these roles: it controls access to the Home Assistant Core API proxy at `/core/api`.

## Use Home Assistant users

If your app has a login that does not go through ingress, do not invent its own user database with passwords in the app options. Check the user's Home Assistant credentials instead. Add `auth_api: true`, and send the user name and password to the Supervisor. Send your token in the `X-Supervisor-Token` header here, not in `Authorization`: this endpoint reads an `Authorization` header as the HTTP basic authentication of the user, and a `Bearer` token there gets a `401`.

```bash
curl -sSL -X POST \
  -H "X-Supervisor-Token: ${SUPERVISOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"username": "jane", "password": "secret"}' \
  http://supervisor/auth
```

A `200` response means the credentials are valid; anything else means they are not. The endpoint also accepts form data, and HTTP basic authentication with the user's credentials in the `Authorization` header.

With ingress, you usually do not need this: Home Assistant already logged the user in, and the [user headers](/apps/guides/ingress/#know-who-is-there) tell you who it is when the ingress session has a user.

## Sign your images

The `build-image` and `publish-multi-arch-manifest` actions of the [builder](/apps/guides/publishing/) can sign your images with Cosign. Signing lets anyone verify that an image came from your repository's workflow. The Supervisor does not check signatures today, and they do not change the security rating, but it costs little to turn on.
