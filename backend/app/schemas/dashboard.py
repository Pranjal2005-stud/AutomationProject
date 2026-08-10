from typing import Any, Dict, List
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_emails: int
    pending_emails: int
    processed_emails: int
    tickets_created: int
    meetings_scheduled: int
    todays_activity: int


class ChartDataPoint(BaseModel):
    label: str
    value: int


class DashboardCharts(BaseModel):
    emails_per_day: List[ChartDataPoint]
    tickets_by_priority: List[ChartDataPoint]
    tickets_by_category: List[ChartDataPoint]
    meetings_by_status: List[ChartDataPoint]
