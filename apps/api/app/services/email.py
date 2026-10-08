from mailjet_rest import Client
from app.core.config import settings


def send_verification_code(to_email: str, code: str, name: str) -> bool:
    if not settings.MAILJET_API_KEY or not settings.MAILJET_SECRET_KEY or not settings.MAILJET_FROM:
        print("mailjet not configured")
        return False

    html = f"""
    <div style="background:#0A0E14;color:#F5F7FA;font-family:'Helvetica Neue',sans-serif;padding:40px 24px;border-radius:12px;max-width:520px;margin:auto;">
      <div style="font-size:22px;font-weight:800;color:#F2B705;letter-spacing:-0.5px;">NMIT NEXUS</div>
      <div style="font-size:11px;color:#6B7280;letter-spacing:1.5px;margin-top:4px;">CAMPUS COMMERCE OS</div>
      <div style="height:1px;background:#1C1F25;margin:24px 0;"></div>
      <p style="font-size:15px;color:#E8EDF5;margin:0 0 12px;">Hi {name},</p>
      <p style="font-size:14px;color:#A6ADB8;margin:0 0 20px;line-height:1.6;">
        Use the code below to verify your email and activate your NMIT Nexus account.
      </p>
      <div style="background:#11161F;border:1px solid #1C1F25;border-radius:10px;padding:24px;text-align:center;margin-bottom:20px;">
        <div style="font-family:monospace;font-size:11px;color:#6B7280;letter-spacing:2px;margin-bottom:8px;">VERIFICATION CODE</div>
        <div style="font-family:monospace;font-size:38px;font-weight:800;color:#F2B705;letter-spacing:12px;">{code}</div>
      </div>
      <p style="font-size:12px;color:#6B7280;line-height:1.6;">
        This code expires in 10 minutes.<br>
        If you didn't request this, you can safely ignore this email.
      </p>
      <div style="height:1px;background:#1C1F25;margin:24px 0;"></div>
      <p style="font-size:10px;color:#52525B;">NMIT Nexus — Student project. Not officially affiliated with Nitte Meenakshi Institute of Technology.</p>
    </div>
    """

    try:
        client = Client(auth=(settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY), version="v3.1")
        payload = {
            "Messages": [
                {
                    "From": {"Email": settings.MAILJET_FROM, "Name": "NMIT Nexus"},
                    "To": [{"Email": to_email, "Name": name}],
                    "Subject": f"Your NMIT Nexus verification code: {code}",
                    "HTMLPart": html,
                }
            ]
        }
        result = client.send.create(data=payload)
        if result.status_code in (200, 201):
            return True
        print(f"mailjet send failed: {result.status_code} {result.json()}")
        return False
    except Exception as e:
        print(f"email send failed: {e}")
        return False
