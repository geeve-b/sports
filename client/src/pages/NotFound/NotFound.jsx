import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-5 d-grid gap-3 justify-items-start" style={{ justifyItems: 'start' }}>
      <p className="wp-label mb-0">Error 404</p>
      <h1 className="wp-title">Offside.</h1>
      <p className="wp-prose mb-2">That page isn’t on the team sheet. The link may be old, or the page was removed.</p>
      <Link to="/" className="btn btn-primary">Back to the Match Centre</Link>
    </div>
  );
}
