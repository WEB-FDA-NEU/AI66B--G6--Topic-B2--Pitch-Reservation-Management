from datetime import timedelta
from sqlalchemy import func, select
from . import settings
from .models import Booking, Report, User
from .rules import notify, open_report_exists
from .timeutil import utcnow


def flag_cancellation_pattern(db, user_id):
    user=db.scalar(select(User).where(User.id==user_id).with_for_update())
    db.flush()
    days=settings.get(db,'cancellation_review_days')
    count=db.scalar(select(func.count()).select_from(Booking).where(
        Booking.customer_id==user_id,Booking.cancel_type=='customer',Booking.payment_status=='refunded',
        Booking.cancelled_at>=utcnow()-timedelta(days=days)))
    if count < settings.get(db,'cancellation_review_count') or open_report_exists(db,'system','user',user_id):
        return
    report=Report(target_type='user',target_id=user_id,target_name=user.full_name,
        reporter_id='system',reporter_name='Hệ thống',reporter_role='system',
        reason='Cần xem xét tần suất hủy và hoàn tiền',
        details=f'{count} đơn do khách tự hủy và hoàn tiền trong {days} ngày. Chỉ là dấu hiệu cần xem xét; tài khoản chưa bị hạn chế.',status='open')
    db.add(report)
    for admin in db.scalars(select(User).where(User.app_role=='admin')):
        notify(db,admin.id,'Tài khoản cần xem xét tần suất hủy',f'{user.full_name}: {count} lần trong {days} ngày.','/admin/reports','reports')


def publish_announcement(db,row):
    if row.type!='announcement' or row.status!='published' or row.announcement_sent_at is not None:
        return
    row.announcement_sent_at=utcnow()
    for user_id in db.scalars(select(User.id)):
        notify(db,user_id,row.title,row.body or '', '/',None)
