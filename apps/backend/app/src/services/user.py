from app.src.repositories.user import repo_create_user
from app.src.models.user import User

class UserService:
  def __init__(self, db):
    self.db = db
    
  def create_user(self, user: User) -> User:
    if user.age < 18:
      raise ValueError("User must be at least 18 years old")
    return repo_create_user(self.db, user)
  