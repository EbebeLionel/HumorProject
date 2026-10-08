import Link from "next/link";
import { getVibe, type ImageWithCaptions } from "@/lib/captions";
import VoteButtons from "./VoteButtons";

type Props = {
  image: ImageWithCaptions;
  myVotes: Record<string, 1 | -1>;
  signedIn: boolean;
  linkToDetail?: boolean;
};

export default function ImageCard({ image, myVotes, signedIn, linkToDetail = true }: Props) {
  const vibe = getVibe(image.vibe);
  const photo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.image_url} alt="User-submitted photo" className="card-photo" loading="lazy" />
  );

  return (
    <article className="card">
      {linkToDetail ? <Link href={`/i/${image.id}`}>{photo}</Link> : photo}
      <div className="card-meta muted">
        {vibe && (
          <span className="chip">
            {vibe.emoji} {vibe.label}
          </span>
        )}
        {image.theme && <span className="chip">📅 {image.theme}</span>}
        <time dateTime={image.created_at}>
          {new Date(image.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </time>
      </div>
      <ol className="captions">
        {image.captions.map((caption) => (
          <li key={caption.id} className="caption">
            <VoteButtons
              captionId={caption.id}
              initialVote={myVotes[caption.id] ?? 0}
              initialUpvotes={caption.upvotes}
              initialDownvotes={caption.downvotes}
              signedIn={signedIn}
            />
            <p className="caption-text">{caption.content}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
