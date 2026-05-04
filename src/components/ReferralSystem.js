import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import './ReferralSystem.css'; // (optionnel si tu veux styliser)

const apiUrl = process.env.REACT_APP_API_URL;

const ReferralSystem = ({ currentUser }) => {
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);

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

  if (!referralLink) return <p>Chargement du lien de parrainage...</p>;

  return (
    <div className="referral-container">
      <h2>🎁 Inviter des amis</h2>

      <p>Partage ton lien de parrainage :</p>

      <div className="referral-link-box">
        <input type="text" value={referralLink} readOnly />
        <button onClick={handleCopy}>
          {copied ? '✅ Copié' : '📋 Copier'}
        </button>
      </div>

      <div className="referral-qr">
        <p>Ou scanne ce QR code :</p>
        <QRCode value={referralLink} size={180} />
      </div>
    </div>
  );
};

export default ReferralSystem;
