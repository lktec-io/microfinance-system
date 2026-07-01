import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export default function ModalPortal({ children }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);
  return createPortal(children, document.body);
}
