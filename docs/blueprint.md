# WhatsApp Mirror Monitor — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that mirrors all incoming and outgoing WhatsApp messages (including media) from a registered number in real time to a single private admin Telegram chat for testing and monitoring. Each mirrored message includes metadata and media, with stored retention for replay.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- internal engineers
- QA testers

## Success criteria

- All WhatsApp messages are mirrored to admin Telegram chat in real time
- Media files are attached and stored with metadata
- Admins can view message history with replay capability

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main admin menu for configuration and status
- **View Message History** (button, actor: admin, callback: history:view) — Access stored mirrored messages with filters by date/direction
  - inputs: date range, message direction
  - outputs: paginated message list with metadata
- **Configure Retention** (button, actor: admin, callback: retention:edit) — Adjust media storage duration
  - inputs: retention period in days
  - outputs: confirmation of new retention policy

## Flows

### Message Mirroring
_Trigger:_ WhatsApp message event

1. Capture WhatsApp message metadata and content
2. Store message with timestamp and direction
3. Attach media files to Telegram post
4. Send to admin chat with metadata caption

_Data touched:_ mirrored_message, admin_chat

### Message Replay
_Trigger:_ /history or button

1. Load stored messages by filter criteria
2. Format message list with metadata
3. Display paginated results

_Data touched:_ mirrored_message

### Retention Configuration
_Trigger:_ /retention or button

1. Validate new retention period
2. Update storage policy
3. Confirm change to admin

_Data touched:_ retention_policy

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **registered_whatsapp_number** _(retention: persistent)_ — Source WhatsApp account being mirrored
  - fields: phone_number, display_name, registration_status
- **mirrored_message** _(retention: persistent)_ — Captured WhatsApp message with metadata and media references
  - fields: timestamp, direction, sender_id, recipient_id, message_text, media_url, media_type, message_id
- **admin_chat** _(retention: persistent)_ — Private Telegram chat receiving mirrored messages
  - fields: chat_id, admin_users, last_sync_time
- **retention_policy** _(retention: persistent)_ — Media storage duration settings
  - fields: days, last_updated

## Integrations

- **Telegram** (required) — Bot API messaging and admin chat delivery
- **WhatsApp Business API** (required) — Message capture and metadata access
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Register WhatsApp number
- Set admin chat ID
- Configure media retention period
- View system status and logs

## Notifications

- Message mirroring failure alerts
- Media storage cleanup notifications
- Retention policy changes

## Permissions & privacy

- Access limited to designated admin chat ID
- Message content stored only for configured retention period
- No third-party data sharing

## Edge cases

- WhatsApp media download failures
- Telegram message delivery failures
- Admin chat ID unauthorized access attempts
- Message ID collisions during mirroring

## Required tests

- End-to-end message mirroring from WhatsApp to Telegram
- Media attachment and metadata display in Telegram
- Message replay with filters
- Retention policy enforcement

## Assumptions

- WhatsApp Business API access is available and configured
- Admin chat ID is pre-approved and static
- Media storage costs are accounted for in the 30-day default
