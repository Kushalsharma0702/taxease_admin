"""
Permission constants and utilities
"""
from typing import List

# Permission constants matching frontend
PERMISSIONS = {
    "ADD_EDIT_PAYMENT": "add_edit_payment",
    "ADD_EDIT_CLIENT": "add_edit_client",
    "REQUEST_DOCUMENTS": "request_documents",
    "ASSIGN_CLIENTS": "assign_clients",
    "VIEW_ANALYTICS": "view_analytics",
    "APPROVE_COST_ESTIMATE": "approve_cost_estimate",
    "UPDATE_WORKFLOW": "update_workflow",
}

# All permissions for superadmin
ALL_PERMISSIONS = list(PERMISSIONS.values())


def has_permission(user_permissions: List[str], required_permission: str) -> bool:
    """Check if user has a specific permission"""
    return required_permission in user_permissions


def require_permission(required_permission: str):
    """Decorator to require a permission (to be used in routes)"""
    def decorator(func):
        # This will be checked in dependencies
        func._required_permission = required_permission
        return func
    return decorator


