from app.src.repositories.user import create_user
from app.src.models.user import User

class UserService:
  def __init__(self, db):
    self.db = db
  def create_user(self, user: User) -> User:
    return create_user(self.db, user)