import Link from "next/link";
import { getVibeLabel, type ImageWithCaptions } from "@/lib/captions";
import OwnerDelete from "./OwnerDelete";
import VoteButtons from "./VoteButtons";

type Props = {
  image: ImageWithCaptions;
  myVotes: Record<string, 1 | -1>;
  userId: string | null;
  linkToDetail?: boolean;
  showRanks?: boolean;
};

export default function ImageCard({ image, myVotes, userId, linkToDetail = true, showRanks = false }: Props) {
  const vibe = getVibeLabel(image.vibe);
  const photo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.image_url} alt="User-submitted photo" className="card-photo" loading="lazy" />
  );

  return (
    <article className="card">
      {linkToDetail ? <Link href={`/i/${image.id}`}>{photo}</Link> : photo}
      <div className="card-meta">
        {vibe && (
          <span className="chip" title={vibe.label}>
            {vibe.emoji} {vibe.label}
          </span>
        )}
        {image.theme && <span className="chip chip-pink">📅 {image.theme}</span>}
        <time dateTime={image.created_at}>
          {new Date(image.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "America/New_York",
          })}
        </time>
        {userId === image.user_id && (
          <OwnerDelete imageId={image.id} redirectTo={linkToDetail ? undefined : "/"} />
        )}
      </div>
      <ol className="captions">
        {image.captions.map((caption, i) => (
          <li key={caption.id} className="caption">
            <VoteButtons
              captionId={caption.id}
              initialVote={myVotes[caption.id] ?? 0}
              initialUpvotes={caption.upvotes}
              initialDownvotes={caption.downvotes}
              signedIn={Boolean(userId)}
            />
            <p className="caption-text">{caption.content}</p>
            {showRanks && i === 0 && caption.score > 0 && <span className="caption-rank">👑 #1</span>}
          </li>
        ))}
      </ol>
    </article>
  );
}
