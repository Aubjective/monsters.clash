# Monsters Clash — Modular Engine Architecture

One authoritative implementation per feature. Avoid patch layers, duplicate engines or override scripts.

Reserved modules: battle, monsters, elements, collection, leveling, evolution, team, deployment, towers, disasters, guardians, economy, progression, save, animation.

Root index.html and existing root JSONs remain active until migrated one module at a time. CSS placeholders are not yet imported. Data folders are reserved for future migration; do not duplicate authoritative data.

Migration procedure: record baseline; move one feature into its own module; connect documented interfaces; test enabled, disabled and dependent features; remove superseded logic only after verification. Preserve saved user progress.

Status: structure only — no game logic moved or changed.
