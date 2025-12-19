# Voting System Documentation

## Overview

The BuNgo Multi-Discord Bots project now features a comprehensive **voting system** that ensures fair usage of music commands across all users in a voice channel. This system allows users to democratically control playback when multiple listeners are present.

---

## How It Works

### Privilege Hierarchy

The voting system recognizes different levels of privilege:

1. **Summoner** (Highest Priority)
   - The user who originally called the bot to join the voice channel
   - Has full control over all music commands
   - Can skip, stop, pause, resume without voting

2. **Track Requester**
   - The user who requested the currently playing track
   - Can control their own track (skip, pause, resume) without voting
   - Cannot stop the player or control other users' tracks without voting

3. **DJ Role Members**
   - Users with configured DJ roles in the server
   - Have full control similar to the summoner
   - Bypass all voting requirements

4. **Autoplay Tracks**
   - Tracks added automatically by the bot (not requested by users)
   - Any user can control these tracks without voting

5. **Regular Users**
   - Must participate in voting when >2 listeners are present
   - Majority vote required (>50% of non-bot listeners)

---

## Commands with Voting

The following commands implement the voting system:

### 1. **Skip** (`/skip`, `b!skip`)
- **Privileged users**: Summoner, track requester, DJ, or any user (if autoplay track)
- **Others**: Require majority vote
- **Voting**: `✅ Skip` vs `❌ Keep` buttons
- **Effect**: Skips to the next track in queue

### 2. **Stop** (`/stop`, `b!stop`)
- **Privileged users**: Summoner, DJ
- **Others**: Require majority vote
- **Voting**: `✅ Stop` vs `❌ Keep` buttons  
- **Effect**: Stops playback and clears the queue

### 3. **Pause** (`/pause`, `b!pause`)
- **Privileged users**: Summoner, track requester, DJ
- **Others**: Require majority vote
- **Voting**: `✅ Pause` vs `❌ Keep` buttons
- **Effect**: Pauses the current track

### 4. **Resume** (`/resume`, `b!resume`)
- **Privileged users**: Summoner, track requester, DJ
- **Others**: Require majority vote
- **Voting**: `✅ Resume` vs `❌ Keep Paused` buttons
- **Effect**: Resumes a paused track

---

## Voting Process

### When Voting is Triggered

1. **Single User or 2 Users**: Commands execute immediately without voting
2. **3+ Users**: Voting system activates for non-privileged users

### How to Vote

1. Non-privileged user uses a voting-enabled command
2. Bot displays an embed with vote count and buttons
3. Other users click `✅` (Yes) or `❌` (No) buttons
4. Each user can vote once per action
5. When majority is reached (>50%), the action executes automatically

### Vote Example

```
User A: Requests "Song X"
User B: Uses /skip

Bot Response:
┌────────────────────────────────┐
│ Vote to skip: 1/3              │
│ ✅ to skip, ❌ to keep playing │
│                                │
│ [✅ Skip]  [❌ Keep]            │
└────────────────────────────────┘

User C: Clicks ✅ Skip
User D: Clicks ✅ Skip

Result: Vote passes (2/3 = 66% > 50%)
Action: Song is skipped automatically
```

---

## Configuration

### Setting Up DJ Roles

1. Use the `/dj` command to manage DJ roles:
   ```
   /dj toggle - Enable/disable DJ mode
   /dj add <@role> - Add a DJ role
   /dj remove <@role> - Remove a DJ role
   /dj clear - Remove all DJ roles
   ```

2. When DJ mode is enabled, users with DJ roles bypass all voting

### Summoner Tracking

- The summoner is automatically tracked when the bot joins a voice channel
- Stored in player state as `summonUserId`
- Persists across bot restarts (saved in session data)

---

## Technical Implementation

### VotingSystem Class

Located in `src/utils/VotingSystem.ts`, this class provides:

#### Key Methods

1. **`hasPrivilege(ctx, player, isDJ)`**
   - Checks if user has privilege to bypass voting
   - Returns privilege status and reason

2. **`checkVote(options)`**
   - Main voting logic
   - Creates voting embed if needed
   - Tracks votes and executes action when majority reached
   - Returns `VoteResult` object

3. **`handleVoteButton(client, interaction, action, voteType)`**
   - Handles button interactions from Discord
   - Updates vote counts
   - Executes action if vote passes

4. **`countListeners(ctx)`**
   - Counts non-bot users in voice channel
   - Used to calculate required votes (majority)

#### Vote Storage

Votes are stored in player state using lavalink-client's player data:
```typescript
player.set('skipVotes', new Set<string>()) // Set of user IDs who voted to skip
player.set('keepVotes', new Set<string>()) // Set of user IDs who voted to keep
player.set('skipVoteMessageId', messageId) // ID of voting embed message
```

### Integration with Commands

Commands integrate the voting system like this:

```typescript
import { VotingSystem } from '../../utils/VotingSystem';

// In command's run method:
const voteResult = await VotingSystem.checkVote({
  client,
  ctx,
  player,
  action: 'skip', // or 'stop', 'pause', 'resume', etc.
});

if (voteResult.alreadyVoted) {
  return await ctx.sendMessage('You have already voted.');
}

if (!voteResult.shouldExecute) {
  return; // Voting embed was sent, waiting for votes
}

// Execute the action
player.skip();
```

---

## Locale Support

All voting messages support internationalization (i18n):

### English (EnglishUS.json)
```json
{
  "cmd": {
    "skip": {
      "messages": {
        "skipped": "Skipped [{title}]({uri}).",
        "vote_embed": "Vote to skip: **{votes}/{needed}**\n✅ to skip, ❌ to keep playing.",
        "button_yes": "✅ Skip",
        "button_no": "❌ Keep",
        "already_voted": "You have already voted."
      }
    }
  }
}
```

Supported languages: English, Vietnamese, Chinese (CN/TW), French, German, Spanish, Japanese, Korean, and more.

---

## Edge Cases Handled

1. **Bot requester detection**: Tracks added by bots (autoplay) are identified and allow any user to control them
2. **Channel changes**: Listener count updates if users join/leave during voting
3. **Message deletion**: Gracefully handles deleted voting embeds
4. **Concurrent votes**: Multiple voting actions (skip + pause) tracked separately
5. **Vote state cleanup**: Votes cleared after action executes or track changes

---

## Best Practices

### For Users
- Wait for voting embed to appear before voting
- Don't spam command if voting is in progress
- DJ roles should be assigned to trusted members only

### For Server Admins
- Configure DJ roles for moderators
- Consider 24/7 mode for dedicated music channels
- Monitor voting activity in busy servers

### For Developers
- Always use `VotingSystem.checkVote()` for new voting-enabled commands
- Don't modify player votes directly - use VotingSystem methods
- Add locale keys for new voting actions

---

## Troubleshooting

### "You have already voted"
- You can only vote once per action
- Wait for current vote to complete before starting another

### "No player found"
- Bot is not in a voice channel
- Restart playback with `/play`

### Votes not counting
- Ensure you're in the same voice channel as the bot
- Check if you have DJ role (DJs bypass voting)
- Verify voting embed buttons are clickable

### Voting doesn't trigger
- Ensure DJ mode is not enabled globally
- Check if you're the requester/summoner (bypasses voting)
- Verify 3+ users are in the voice channel

---

## Future Enhancements

Potential improvements to the voting system:

1. **Configurable thresholds**: Allow servers to set custom vote percentages (e.g., 75% instead of 50%)
2. **Vote timeout**: Automatically fail votes after X minutes of inactivity
3. **Vote history**: Track who voted for what (for moderation)
4. **Whitelist/blacklist**: Prevent specific users from voting
5. **Vote cooldown**: Limit how often users can initiate votes

---

## API Reference

### VoteResult Interface

```typescript
interface VoteResult {
  shouldExecute: boolean;     // True if action should execute now
  alreadyVoted?: boolean;     // True if user already voted
  isPrivileged?: boolean;     // True if user bypassed voting
  needsVoting?: boolean;      // True if voting is in progress
}
```

### VoteCheckOptions Interface

```typescript
interface VoteCheckOptions {
  client: Lavamusic;         // Bot client instance
  ctx: Context;              // Command context
  player: Player;            // Lavalink player instance
  action: string;            // Action name ('skip', 'stop', etc.)
  actionData?: any;          // Optional data for the action
}
```

---

## Credits

**Voting System Implementation**
- Designed and implemented by: GitHub Copilot & ductridev
- Based on: DisTube voting pattern
- Enhanced for: Multi-bot architecture with privilege hierarchy

---

For questions or issues with the voting system, please open an issue on the GitHub repository or contact the development team.
