import secrets

def generate_otp_code():
    return str(secrets.randbelow(900000) + 100000)