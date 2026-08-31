# Administrator & Proctor Guide

## 1. Generating Cryptographic Signing Keys

All `.examconfig` files must be digitally signed with an Ed25519 asymmetric private key before distribution to students.

Run the keygen command using the `@seb/config-tool`:

```bash
# Generate Ed25519 keypair
npx seb-config keygen --out ./keys --name university-key
```

This creates:
- `university-key.priv.pem` (Keep strictly confidential in secure storage)
- `university-key.pub.pem` (Register on Exam Backend Server)

---

## 2. Creating and Signing an Exam Configuration

To generate a new `.examconfig` file for an upcoming exam:

```bash
npx seb-config create \
  --exam-id "CS-301-FINAL" \
  --name "Operating Systems Final Examination" \
  --url "https://exam.university.edu/course/301/exam" \
  --org "Department of Computer Science" \
  --hours 3 \
  --password "ProctorPass2026!" \
  --key "./keys/university-key.priv.pem" \
  --output "cs301-final.examconfig" \
  --server "http://localhost:8080"
```

---

## 3. Registering the Configuration on the Exam Server

Upload the configuration and public key to the Exam Backend Server:

```bash
curl -X POST http://localhost:8080/api/v1/admin/configs \
  -H "Content-Type: application/json" \
  -d '{
    "config": '$(cat cs301-final.examconfig)',
    "trustedPublicKeyPem": "'$(cat ./keys/university-key.pub.pem | tr '\n' '\\n')'"
  }'
```

---

## 4. Live Monitoring via Admin Dashboard

1. Launch the Exam Backend Server:
   ```bash
   npm run start:server
   ```
2. Launch the Operations Console:
   ```bash
   npm run start:admin
   ```
3. Open `http://localhost:5173` in your browser.
4. View live connected students, real-time risk scores (0-100), violations feed (unauthorized URLs, hotkeys blocked, secondary displays connected).
5. Use the **Terminate** button to instantly eject any cheating student from the examination.

---

## 5. Emergency Configuration Revocation

If a configuration is leaked or an exam is postponed:

```bash
curl -X POST http://localhost:8080/api/v1/admin/revoke \
  -H "Content-Type: application/json" \
  -d '{"configurationId": "<CONFIG_UUID>"}'
```

Active student clients will receive the revocation status on their next 10-second heartbeat and terminate the session immediately.
