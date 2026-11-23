# Re-registration email: old Qualty companies and inspectors

Sender: `Qualty <team@qualty.ai>` · Reply-to: `iq@cargofirst.net` · Signed: Team Qualty

`send.mjs` reads this file. It takes the numbered lines under **Subject options**, the
` ```text ` block under **Plain text** and the ` ```html ` block under **HTML**. Edit the copy
freely but keep those three headings and the fences.

Placeholder: `{{greeting_name}}` becomes the contact name, else the company name, else it is
dropped and the greeting reads "Hello,".

## Subject options

1. Qualty has a new platform for inspection companies
2. Please re-register your company on the new Qualty

## Plain text

```text
Hello {{greeting_name}},

You registered with Qualty on our earlier platform. We have rebuilt Qualty, and the new version is live at https://qualty.ai/companies

Accounts from the old platform did not move across, so you will need to register again. It takes a few minutes. Keep your PAN and GSTIN ready for the KYC step.

What the new platform gives your company:

- Your own company dashboard at https://qualty.ai/dashboard
- A place in the Qualty service store, where customers book you directly at the price you set
- Payments collected by Qualty and paid out to you
- A chatroom for every order, so the customer and your team talk in one place
- Certificates with a check code, so the holder can confirm a certificate is real and still valid
- Standard-rate services such as ECTN and CoC, at fixed rates across India

Register here: https://qualty.ai/companies

If anything is unclear, reply to this email and we will help.

Team Qualty

--
You are getting this email because your company registered on the earlier Qualty platform. To stop hearing from us, reply with "unsubscribe" and we will take you off this list.
```

## HTML

```html
<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;">
    <p>Hello {{greeting_name}},</p>
    <p>You registered with Qualty on our earlier platform. We have rebuilt Qualty, and the new version is live at <a href="https://qualty.ai/companies" style="color:#1a1a1a;">qualty.ai/companies</a>.</p>
    <p>Accounts from the old platform did not move across, so you will need to register again. It takes a few minutes. Keep your PAN and GSTIN ready for the KYC step.</p>
    <p style="margin-bottom:6px;">What the new platform gives your company:</p>
    <ul style="margin-top:0;padding-left:20px;">
      <li>Your own company dashboard at <a href="https://qualty.ai/dashboard" style="color:#1a1a1a;">qualty.ai/dashboard</a></li>
      <li>A place in the Qualty service store, where customers book you directly at the price you set</li>
      <li>Payments collected by Qualty and paid out to you</li>
      <li>A chatroom for every order, so the customer and your team talk in one place</li>
      <li>Certificates with a check code, so the holder can confirm a certificate is real and still valid</li>
      <li>Standard-rate services such as ECTN and CoC, at fixed rates across India</li>
    </ul>
    <p><a href="https://qualty.ai/companies" style="display:inline-block;padding:10px 18px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;">Register your company</a></p>
    <p>If anything is unclear, reply to this email and we will help.</p>
    <p>Team Qualty</p>
    <p style="margin-top:32px;font-size:12px;color:#6b6b6b;">You are getting this email because your company registered on the earlier Qualty platform. To stop hearing from us, reply with "unsubscribe" and we will take you off this list.</p>
  </div>
</body>
</html>
```

## Notes for review

- No numbers, prices or rates are quoted on purpose. Add one only if it is on qualty.ai.
- PAN and GSTIN are Indian documents. International companies and inspectors in the list will
  not have them. If you mail them, consider a variant line such as "Keep your company
  registration documents ready for the KYC step", after checking what the KYC form asks
  non-Indian companies for.
- Inspectors in the list are individuals. The copy says "your company"; it still reads fine for a
  one-person inspection business, but you can drop the inspector rows (filter `source`) if they
  should not get it.
