'use client';

const NOTIFICATION_TYPES = [
  {
    type: 'FOLLOW',
    trigger: 'A user follows another user',
    pushTitle: 'New Follower',
    pushBody: '{actor} started following you',
    preference: 'follow_notifications',
  },
  {
    type: 'TOUCHDOWN',
    trigger: 'A user gives a TD reaction on a post',
    pushTitle: 'Touchdown!',
    pushBody: '{actor} gave your take a TD',
    preference: 'reaction_notifications',
  },
  {
    type: 'FUMBLE',
    trigger: 'A user gives a Fumble reaction on a post',
    pushTitle: 'Fumble',
    pushBody: '{actor} fumbled your take',
    preference: 'reaction_notifications',
  },
  {
    type: 'REPOST',
    trigger: 'A user reposts another user\'s post',
    pushTitle: 'Repost',
    pushBody: '{actor} reposted your take',
    preference: 'reaction_notifications',
  },
  {
    type: 'REPLY',
    trigger: 'A user replies to a post',
    pushTitle: 'New Reply',
    pushBody: '{actor} replied to your take',
    preference: 'reply_notifications',
  },
  {
    type: 'CHALLENGE',
    trigger: 'A user challenges another user on a post',
    pushTitle: 'Challenge!',
    pushBody: '{actor} challenged you',
    preference: 'challenge_notifications',
  },
  {
    type: 'CHALLENGE_RECEIVED',
    trigger: 'Same as CHALLENGE (alias)',
    pushTitle: 'Challenge!',
    pushBody: '{actor} challenged you',
    preference: 'challenge_notifications',
  },
  {
    type: 'CHALLENGE_RESPONSE',
    trigger: 'The challenged user responds to a challenge',
    pushTitle: 'Challenge Update',
    pushBody: '{actor} responded to your challenge',
    preference: 'challenge_notifications',
  },
  {
    type: 'CHALLENGE_WON',
    trigger: 'A challenge is resolved and the user won',
    pushTitle: 'Victory!',
    pushBody: 'You won the challenge against {actor}',
    preference: 'challenge_notifications',
  },
  {
    type: 'CHALLENGE_LOST',
    trigger: 'A challenge is resolved and the user lost',
    pushTitle: 'Defeat',
    pushBody: 'You lost the challenge against {actor}',
    preference: 'challenge_notifications',
  },
  {
    type: 'CHALLENGE_RESULT',
    trigger: 'Generic challenge outcome notification',
    pushTitle: 'Challenge Result',
    pushBody: 'Your challenge against {actor} has been decided',
    preference: 'challenge_notifications',
  },
  {
    type: 'RIVALRY_FEATURED',
    trigger: 'A rivalry post is featured',
    pushTitle: 'CFB Social',
    pushBody: 'You have a new notification',
    preference: 'rivalry_notifications',
  },
  {
    type: 'RIVALRY_VOTE',
    trigger: 'A user votes on a rivalry matchup',
    pushTitle: 'CFB Social',
    pushBody: 'You have a new notification',
    preference: 'rivalry_notifications',
  },
  {
    type: 'POST_FLAGGED',
    trigger: 'A post is flagged for moderation review',
    pushTitle: 'Post Flagged',
    pushBody: 'Your post was flagged for review',
    preference: 'moderation_notifications',
  },
  {
    type: 'MODERATION_WARNING',
    trigger: 'User receives a moderation warning',
    pushTitle: 'Post Flagged',
    pushBody: 'Your post was flagged for review',
    preference: 'moderation_notifications',
  },
  {
    type: 'MODERATION_APPEAL_RESULT',
    trigger: 'User\'s moderation appeal is resolved',
    pushTitle: 'Appeal Update',
    pushBody: 'Your appeal was {approved/denied}',
    preference: 'moderation_notifications',
  },
  {
    type: 'ACHIEVEMENT_UNLOCKED',
    trigger: 'User unlocks a dynasty achievement',
    pushTitle: 'Achievement Unlocked!',
    pushBody: 'You unlocked: {achievement_name}',
    preference: 'follow_notifications',
  },
  {
    type: 'LEVEL_UP',
    trigger: 'User reaches a new dynasty level',
    pushTitle: 'Level Up!',
    pushBody: 'You reached {level_name}!',
    preference: 'follow_notifications',
  },
  {
    type: 'PREDICTION_RESULT',
    trigger: 'A prediction is graded (receipt/bust/push/expired)',
    pushTitle: 'Prediction Result',
    pushBody: 'Your prediction was marked as {verdict}',
    preference: 'follow_notifications',
  },
  {
    type: 'AGING_TAKE_SURFACED',
    trigger: 'An aging take is resurfaced for community review',
    pushTitle: 'Take Resurfaced',
    pushBody: 'One of your aging takes has been surfaced for review',
    preference: 'follow_notifications',
  },
  {
    type: 'RECEIPT_VERIFIED',
    trigger: 'A prediction ages well and is confirmed as a receipt',
    pushTitle: 'Receipt Verified!',
    pushBody: 'Your prediction aged well -- receipt confirmed',
    preference: 'follow_notifications',
  },
  {
    type: 'PORTAL_COMMIT',
    trigger: 'A portal player the user claimed has committed',
    pushTitle: 'Portal Update',
    pushBody: 'A player you claimed has committed',
    preference: 'follow_notifications',
  },
  {
    type: 'SYSTEM',
    trigger: 'Admin broadcast or system-generated message',
    pushTitle: 'CFB Social',
    pushBody: '{custom message from broadcast}',
    preference: 'marketing_notifications',
  },
];

const PREF_LABELS: Record<string, string> = {
  follow_notifications: 'Follows & General',
  reaction_notifications: 'Reactions',
  reply_notifications: 'Replies',
  challenge_notifications: 'Challenges',
  rivalry_notifications: 'Rivalries',
  moderation_notifications: 'Moderation',
  marketing_notifications: 'Marketing / System',
};

const PREF_COLORS: Record<string, string> = {
  follow_notifications: '#2a7a2a',
  reaction_notifications: '#b8952a',
  reply_notifications: '#2a5a9e',
  challenge_notifications: '#8b1a1a',
  rivalry_notifications: '#7a2a7a',
  moderation_notifications: '#aa4400',
  marketing_notifications: '#555',
};

export function NotificationTypesTab() {
  return (
    <div>
      <div className="admin-card" style={{ padding: 24 }}>
        <h3 className="admin-subsection-title" style={{ marginTop: 0 }}>
          Notification Types Reference
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: 16 }}>
          All notification types the system sends, what triggers them, the push message content, and which user preference controls them.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--admin-border, #444)',
                  textAlign: 'left',
                }}
              >
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Trigger</th>
                <th style={thStyle}>Push Title</th>
                <th style={thStyle}>Push Body</th>
                <th style={thStyle}>Preference Category</th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_TYPES.map((nt) => (
                <tr key={nt.type} style={{ borderBottom: '1px solid var(--admin-border, #333)' }}>
                  <td style={tdStyle}>
                    <code
                      style={{
                        fontFamily: 'var(--admin-mono, monospace)',
                        fontSize: '0.75rem',
                        background: 'var(--admin-surface, rgba(255,255,255,0.05))',
                        padding: '2px 6px',
                        borderRadius: 3,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {nt.type}
                    </code>
                  </td>
                  <td style={tdStyle}>{nt.trigger}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{nt.pushTitle}</td>
                  <td style={tdStyle}>
                    <span style={{ color: 'var(--admin-text-secondary)' }}>{nt.pushBody}</span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#fff',
                        backgroundColor: PREF_COLORS[nt.preference] || '#555',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {PREF_LABELS[nt.preference] || nt.preference}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preference categories legend */}
      <div className="admin-card" style={{ padding: 24, marginTop: 16 }}>
        <h3 className="admin-subsection-title" style={{ marginTop: 0 }}>
          Preference Categories
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: 12 }}>
          Users can toggle each category on/off in their notification preferences. If a category is disabled, push notifications of that type are suppressed.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(PREF_LABELS).map(([key, label]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: 'var(--admin-surface, rgba(255,255,255,0.05))',
                borderRadius: 6,
                fontSize: '0.78rem',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: PREF_COLORS[key] || '#555',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600 }}>{label}</span>
              <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.7rem' }}>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontFamily: 'var(--admin-serif)',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--admin-text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
  lineHeight: 1.4,
};
