import { Component } from 'react';
import { FiAlertOctagon, FiRefreshCw, FiHome } from 'react-icons/fi';
import { t } from '../../i18n/bilingual';

/**
 * Catches render errors (including failed lazy-chunk loads after a deploy)
 * and shows a bilingual recovery screen instead of a blank page.
 * `resetKey` clears the error when it changes — pass the route pathname.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const title  = t('error.title');
    const body   = t('error.body');
    const reload = t('error.reload');
    const home   = t('error.home');

    return (
      <div className={`mf-crash${this.props.fullScreen ? ' mf-crash--full' : ''}`} role="alert">
        <div className="mf-crash__card">
          <span className="mf-crash__icon"><FiAlertOctagon size={26} /></span>
          <h1 className="mf-crash__title">{title.en}</h1>
          <p className="mf-crash__sw" lang="sw">{title.sw}</p>
          <p className="mf-crash__body">{body.en}</p>
          <p className="mf-crash__body mf-crash__sw" lang="sw">{body.sw}</p>
          <div className="mf-crash__actions">
            <button type="button" className="mf-btn mf-btn--primary" onClick={() => window.location.reload()}>
              <FiRefreshCw size={17} /> {reload.en} <span lang="sw">· {reload.sw}</span>
            </button>
            <a className="mf-btn mf-btn--ghost" href="/">
              <FiHome size={17} /> {home.en} <span lang="sw">· {home.sw}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }
}
