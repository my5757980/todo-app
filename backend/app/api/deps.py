from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session

# HTTPBearer extracts the token from "Authorization: Bearer <token>"
# auto_error=False so we can return a custom 401 message
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_id(
    user_id: str,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> str:
    """Verify session token against the Better Auth session table.

    Better Auth uses EdDSA JWTs (asymmetric) — instead of replicating that
    crypto in Python, we verify the session token directly in the DB.

    Raises:
        401 — missing or invalid/expired session token
        403 — valid session but user_id in path ≠ session owner

    Returns:
        The authenticated user's ID string

    Ref: backend/CLAUDE.md § JWT / Auth Rules
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    result = await session.execute(
        text(
            'SELECT "userId" FROM session '
            'WHERE token = :token AND "expiresAt" > NOW()'
        ),
        {"token": token},
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    db_user_id: str = row[0]

    # Path user_id MUST match session owner — FR-018
    if db_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token identity does not match the requested user",
        )

    return db_user_id
