import type { TripMember } from '../types/trip';

export function MemberList({ members }: { members: TripMember[] }) {
  if (members.length === 0) return <p className="empty-row">尚未加入成員。</p>;

  return (
    <ul className="member-list" aria-label="家庭成員">
      {members.map((member) => (
        <li className="member-item" key={member.id}>
          <span className="member-avatar" aria-hidden="true">{member.avatar}</span>
          <span>{member.name}</span>
        </li>
      ))}
    </ul>
  );
}
