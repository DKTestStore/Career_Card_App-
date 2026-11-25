import { Logo } from '../components/Layout';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';

export function LogoutPage() {
  const { signInAsGuest, firstName } = useAuth();

  const signBackIn = () => {
    signInAsGuest(firstName);
    navigate('/', true);
  };

  return (
    <div className="gate signed-out">
      <a href="#logout-main" className="skip-link">Skip to content</a>
      <header className="gate-top">
        <span className="brand brand-on-light">
          <Logo />
          <span><b>Hire Ready</b><small>Resume Studio</small></span>
        </span>
      </header>

      <main id="logout-main" className="signed-out-main" tabIndex={-1}>
        <span className="so-ico" aria-hidden="true"><Icon name="logout" size={28} /></span>
        <h1>You're signed out</h1>
        <p className="lede">This was a guest session on this device. Come back any time — no account needed.</p>
        <div className="so-actions">
          <button type="button" className="btn btn-primary btn-lg" data-testid="sign-back-in" onClick={signBackIn}>
            Sign back in
          </button>
          <button type="button" className="btn btn-outline btn-lg" data-testid="back-to-welcome" onClick={() => navigate('/welcome', true)}>
            Back to welcome
          </button>
        </div>
      </main>
    </div>
  );
}
