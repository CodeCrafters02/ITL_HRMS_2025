import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from app.models import Employee
from employee.models import (
    CourseCategory, TrainerProfile, Course, CourseReview,
    Enrollment, Certificate, ComplianceAssignment, TrainingRequest,
    TrainingSession, SessionAttendance,
)

CATEGORIES = ['Technical', 'HR', 'Finance', 'Leadership', 'Compliance', 'Soft Skills']

COURSES = [
    ('Python for Backend Engineers', 'Technical', 'intermediate', 18, False),
    ('React & Modern Frontend', 'Technical', 'intermediate', 16, False),
    ('Cloud Fundamentals (AWS)', 'Technical', 'beginner', 12, False),
    ('SQL & Data Modeling', 'Technical', 'beginner', 10, False),
    ('Effective Performance Reviews', 'HR', 'beginner', 4, False),
    ('Recruitment & Interviewing Skills', 'HR', 'intermediate', 6, False),
    ('Budgeting & Financial Planning', 'Finance', 'intermediate', 8, False),
    ('Payroll & Statutory Compliance', 'Finance', 'advanced', 10, False),
    ('Leading High-Performing Teams', 'Leadership', 'advanced', 12, False),
    ('Decision Making for Managers', 'Leadership', 'intermediate', 6, False),
    ('POSH Awareness Training', 'Compliance', 'beginner', 2, True),
    ('Information Security Basics', 'Compliance', 'beginner', 3, True),
    ('Fire & Workplace Safety', 'Compliance', 'beginner', 2, True),
    ('Business Communication Skills', 'Soft Skills', 'beginner', 5, False),
    ('Time Management & Productivity', 'Soft Skills', 'beginner', 4, False),
    ('Conflict Resolution at Work', 'Soft Skills', 'intermediate', 5, False),
]

TRAINING_REQUEST_TITLES = [
    'Advanced Kubernetes Administration', 'Certified Scrum Master', 'Google Analytics Certification',
    'Public Speaking Masterclass', 'Six Sigma Green Belt',
]


class Command(BaseCommand):
    help = 'Seed realistic demo data for the Learning Management System dashboard.'

    def handle(self, *args, **options):
        if Course.objects.exists():
            self.stdout.write(self.style.WARNING('Courses already exist — skipping seed to avoid duplicates.'))
            return

        employees = list(Employee.objects.filter(is_active=True))
        if len(employees) < 5:
            self.stdout.write(self.style.ERROR('Not enough active employees in the DB to seed LMS demo data.'))
            return

        now = timezone.now()

        categories = {name: CourseCategory.objects.get_or_create(name=name)[0] for name in CATEGORIES}

        trainers = []
        for emp in random.sample(employees, min(4, len(employees))):
            trainers.append(TrainerProfile.objects.create(
                employee=emp, trainer_type='internal',
                full_name=emp.full_name, email=emp.email or '',
                specialization=random.choice(CATEGORIES),
            ))
        for name in ['Aditi Sharma (External)', 'Michael Chen (External)']:
            trainers.append(TrainerProfile.objects.create(
                trainer_type='external', full_name=name,
                email=f"{name.split()[0].lower()}@external-training.com",
                specialization=random.choice(CATEGORIES),
            ))

        courses = []
        for title, cat, level, hours, is_compliance in COURSES:
            status = 'published' if random.random() > 0.15 else 'draft'
            courses.append(Course.objects.create(
                title=title, category=categories[cat], difficulty_level=level,
                duration_hours=hours, is_compliance=is_compliance,
                compliance_due_days=30 if is_compliance else None,
                status=status, trainer=random.choice(trainers),
                created_by=random.choice(employees),
                description=f'A {level} level course covering {title.lower()}.',
            ))

        published_courses = [c for c in courses if c.status == 'published']
        compliance_courses = [c for c in courses if c.is_compliance]

        # ---- Enrollments ----
        enrollment_statuses = ['completed'] * 4 + ['in_progress'] * 3 + ['enrolled'] * 2 + ['cancelled'] + ['waitlisted']
        for emp in employees:
            for course in random.sample(published_courses, k=min(random.randint(1, 4), len(published_courses))):
                status = random.choice(enrollment_statuses)
                progress = {'completed': 100, 'in_progress': random.randint(20, 80),
                            'enrolled': random.randint(0, 15), 'cancelled': random.randint(0, 40),
                            'waitlisted': 0}[status]
                enrolled_at = now - timedelta(days=random.randint(1, 175))
                enr = Enrollment.objects.create(
                    employee=emp, course=course,
                    enrolled_by=random.choice(['self', 'self', 'manager', 'admin']),
                    status=status, progress_percentage=progress,
                    enrolled_at=enrolled_at,
                    started_at=enrolled_at if status != 'waitlisted' else None,
                    completed_at=enrolled_at + timedelta(days=random.randint(3, 30)) if status == 'completed' else None,
                )
                Enrollment.objects.filter(pk=enr.pk).update(enrolled_at=enrolled_at)

                if status == 'completed' and random.random() > 0.4:
                    CourseReview.objects.get_or_create(
                        course=course, employee=emp,
                        defaults={'rating': random.randint(3, 5), 'review_text': 'Well structured and useful.'}
                    )
                    cert_date = enr.completed_at or now
                    cert = Certificate.objects.create(
                        employee=emp, course=course,
                        certificate_name=f'{course.title} - Completion Certificate',
                        issuing_authority='ITL Learning Academy', source='internal',
                        certificate_number=f'CERT-{course.id}-{emp.id}-{random.randint(1000,9999)}',
                        issue_date=cert_date.date(),
                        expiry_date=cert_date.date() + timedelta(days=730) if course.is_compliance else None,
                        status='valid',
                    )
                    Certificate.objects.filter(pk=cert.pk).update(created_at=cert_date)

        # ---- Compliance assignments ----
        for course in compliance_courses:
            for emp in random.sample(employees, k=min(random.randint(15, len(employees)), len(employees))):
                due_date = (now + timedelta(days=random.randint(-20, 30))).date()
                status = random.choice(['completed', 'completed', 'pending', 'overdue'])
                ComplianceAssignment.objects.get_or_create(
                    course=course, employee=emp,
                    defaults={
                        'due_date': due_date, 'status': status,
                        'completed_at': now - timedelta(days=random.randint(1, 60)) if status == 'completed' else None,
                    }
                )

        # ---- Training requests ----
        for _ in range(18):
            emp = random.choice(employees)
            use_catalog = random.random() > 0.4
            manager_status = random.choice(['pending', 'approved', 'approved', 'rejected'])
            admin_status = random.choice(['approved', 'pending']) if manager_status == 'approved' else 'pending'
            TrainingRequest.objects.create(
                employee=emp,
                course=random.choice(courses) if use_catalog else None,
                custom_course_title='' if use_catalog else random.choice(TRAINING_REQUEST_TITLES),
                reason='Relevant to my current role and upcoming project needs.',
                manager=emp.reporting_manager, manager_status=manager_status,
                admin_status=admin_status,
            )

        # ---- Training sessions ----
        for i in range(8):
            course = random.choice(published_courses)
            start = now + timedelta(days=random.randint(-15, 45), hours=random.choice([9, 11, 14]))
            session = TrainingSession.objects.create(
                course=course, title=f'{course.title} - Live Session',
                session_type=random.choice(['classroom', 'online', 'webinar']),
                trainer=course.trainer, start_datetime=start,
                end_datetime=start + timedelta(hours=2),
                location='ITL Training Room' if random.random() > 0.5 else '',
                meeting_link='https://meet.itl.com/session' if random.random() > 0.5 else '',
                max_seats=30,
            )
            for emp in random.sample(employees, k=min(random.randint(5, 15), len(employees))):
                SessionAttendance.objects.get_or_create(
                    session=session, employee=emp,
                    defaults={'status': 'registered' if start > now else random.choice(['attended', 'absent'])}
                )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(courses)} courses, {Enrollment.objects.count()} enrollments, '
            f'{Certificate.objects.count()} certificates, {TrainingRequest.objects.count()} training requests, '
            f'{TrainingSession.objects.count()} training sessions.'
        ))
