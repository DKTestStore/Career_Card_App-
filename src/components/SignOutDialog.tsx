import { useState } from 'react';
import { Modal, ConfirmDialog } from './Modal';
import { Icon } from './Icon';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { download, todayStr } from '../lib/util';
import { useToast } from './Toast';

type Mode = 'keep' | 'erase';

export function SignOutDialog({ onClose }: { onClose: () => void }) {
  const { endSession, clearProfile } = useAuth();
  const { exportBackup, clearAll } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('keep');
  const [confirmErase, setConfirmErase] = useState(false);

  const finish = async (erase: boolean) => {
    if (erase) {
      await clearAll();
      clearProfile();
    }
    endSession();
    onClose();
    navigate('/logout', true);
  };

  const onSubmit = async () => {
    if (mode === 'erase') { setConfirmErase(true); return; }
    await finish(false);
  };

  const downloadBackup = () => {
    download(`hire-ready-backup-${todayStr()}.json`, JSON.stringify(exportBackup(), null, 2));
    toast('Backup downloaded');
  };

  return (
    <>
      <Modal
        title="Sign out?"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className={`btn ${mode === 'erase' ? 'btn-danger' : 'btn-primary'}`}
              data-testid="confirm-sign-out"
              onClick={onSubmit}
            >
              {mode === 'erase' ? 'Continue' : 'Sign out'}
            </button>
          </>
        }
      >
        <p className="muted">You’re using Hire Ready as a guest on this device. Choose what should happen to your local data.</p>
        <fieldset className="signout-choices">
          <legend className="sr-only">Data on this device</legend>
          <label className={`choice${mode === 'keep' ? ' selected' : ''}`}>
            <input type="radio" name="signout-mode" value="keep" checked={mode === 'keep'} onChange={() => setMode('keep')} />
            <span>
              <b>Keep my data on this device</b>
              <small>Resumes and applications stay here. The next visit will show the welcome page until you sign back in.</small>
            </span>
          </label>
          <label className={`choice danger${mode === 'erase' ? ' selected' : ''}`}>
            <input type="radio" name="signout-mode" value="erase" checked={mode === 'erase'} onChange={() => setMode('erase')} />
            <span>
              <b>Sign out and erase data from this device</b>
              <small>Permanently deletes resumes, versions and applications stored in this browser.</small>
            </span>
          </label>
        </fieldset>
        <button type="button" className="link download-backup" onClick={downloadBackup}>
          <Icon name="download" size={15} /> Download backup first
        </button>
      </Modal>

      {confirmErase && (
        <ConfirmDialog
          title="Erase all data?"
          confirmLabel="Sign out and erase"
          onClose={() => setConfirmErase(false)}
          message="This permanently deletes every resume, saved version and application on this device. Download a backup first if you might need them."
          onConfirm={() => { void finish(true); }}
        />
      )}
    </>
  );
}
