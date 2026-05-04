import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

import { useNavigate } from 'react-router-dom';
import './Invitation.css';

const apiUrl = process.env.REACT_APP_API_URL;

const Invitation = ({ currentUser }) => {
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.id) {
      const code = currentUser.referral_code || currentUser.username;
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/register?ref=${code}`;
      setReferralLink(link);
    }
  }, [currentUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentUser) return <p>Chargement...</p>;

  return (
    <div className="invitation-container">
      <h2>🎁 Inviter un ami</h2>

      <div className="invitation-link-box">
        <p>Voici ton lien de parrainage :</p>
        <input type="text" value={referralLink} readOnly />
        <button onClick={handleCopy}>{copied ? '✅ Copié' : '📋 Copier'}</button>
      </div>

      <div className="invitation-qr">
        <p>Ou scanne ce QR Code :</p>
        <QRCodeCanvas value={referralLink} size={200} />
      </div>

      <button className="back-button" onClick={() => navigate(-1)}>
        ⬅️ Retour
      </button>
    </div>
  );
};

export default Invitation;
