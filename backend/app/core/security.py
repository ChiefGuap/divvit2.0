from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize the rate limiter using the remote address as the unique identifier.
# We will rely on ProxyHeadersMiddleware to parse X-Forwarded-For correctly.
limiter = Limiter(key_func=get_remote_address)
