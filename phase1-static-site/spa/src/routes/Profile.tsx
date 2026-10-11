import { Link } from 'react-router';

export const Profile = () => (
  <div>
    <h1>Profile</h1>

    <p>This is the profile page.</p>

    <Link viewTransition to="/">
      ← Go to Top
    </Link>
  </div>
);
