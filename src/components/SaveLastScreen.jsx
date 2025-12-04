// SaveLastScreen.jsx
import { useEffect } from 'react';
import { setCookie } from '../utils/common';

const SaveLastScreen = ({ path }) => {
  useEffect(() => {
    setCookie('last_screen_path', path);
  }, [path]);

  return null;
};

export default SaveLastScreen;