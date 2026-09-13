import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { lockScroll } from '../../utils/scrollLock';

export default function ModalPortal({ children }) {
  useEffect(() => lockScroll(), []);
  return createPortal(children, document.body);
}
