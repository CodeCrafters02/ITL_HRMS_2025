import os
import sys
import django

# Add backend directory to path
sys.path.append('d:/Innovyx Project/ITL_HRMS_2025/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from employee.models import AppraisalEvaluation, AppraisalAnswer

def backfill():
    evals = AppraisalEvaluation.objects.all()
    updated_count = 0
    print(f"Total evaluations in DB: {evals.count()}")
    for ev in evals:
        updated = False
        
        # 1. Backfill self_overall_rating
        self_answers = AppraisalAnswer.objects.filter(evaluation=ev, question__role_type='self')
        self_ratings = [a.rating_score for a in self_answers if a.rating_score is not None]
        if self_ratings:
            avg_self = sum(self_ratings) / len(self_ratings)
            if ev.self_overall_rating is None or abs(float(ev.self_overall_rating) - avg_self) > 0.01:
                ev.self_overall_rating = avg_self
                updated = True
                print(f"Evaluation ID {ev.id} ({ev.employee.first_name}): Self Rating updated to {avg_self:.2f}")

        # 2. Backfill manager_overall_rating
        mgr_answers = AppraisalAnswer.objects.filter(evaluation=ev, question__role_type='manager')
        mgr_ratings = [a.rating_score for a in mgr_answers if a.rating_score is not None]
        if mgr_ratings:
            avg_mgr = sum(mgr_ratings) / len(mgr_ratings)
            if ev.manager_overall_rating is None or abs(float(ev.manager_overall_rating) - avg_mgr) > 0.01:
                ev.manager_overall_rating = avg_mgr
                updated = True
                print(f"Evaluation ID {ev.id} ({ev.employee.first_name}): Manager Rating updated to {avg_mgr:.2f}")

        # 3. Backfill hr_overall_rating
        hr_answers = AppraisalAnswer.objects.filter(evaluation=ev, question__role_type='hr')
        hr_ratings = [a.rating_score for a in hr_answers if a.rating_score is not None]
        if hr_ratings:
            avg_hr = sum(hr_ratings) / len(hr_ratings)
            if ev.hr_overall_rating is None or abs(float(ev.hr_overall_rating) - avg_hr) > 0.01:
                ev.hr_overall_rating = avg_hr
                updated = True
                print(f"Evaluation ID {ev.id} ({ev.employee.first_name}): HR Rating updated to {avg_hr:.2f}")

        if updated:
            ev.save(update_fields=['self_overall_rating', 'manager_overall_rating', 'hr_overall_rating'])
            updated_count += 1
            
    print(f"Backfill complete. Updated {updated_count} evaluations.")

if __name__ == '__main__':
    backfill()
