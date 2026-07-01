from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from app.models import Employee
from .models import AppraisalCycle, AppraisalEvaluation, AppraisalQuestion, AppraisalAnswer
from .serializers import AppraisalAnswerSerializer

class HRDirectAppraisalAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Verify user is staff (admin/hr)
        if not (request.user.is_staff or getattr(request.user, 'role', '') in ['admin', 'hr']):
            raise PermissionDenied("You do not have permission to view HR appraisals.")

        # 2. Get active cycle
        active_cycle = AppraisalCycle.objects.filter(status='active').first()
        if not active_cycle:
            return Response({"detail": "There is no active appraisal cycle configured."}, status=400)

        # 3. Check for specific employee details
        employee_id = request.query_params.get('employee_id')
        if employee_id:
            target_emp = get_object_or_404(Employee, id=employee_id)
            
            # Fetch HR specific questions
            hr_questions = AppraisalQuestion.objects.filter(cycle=active_cycle, role_type='hr')
            
            # Fetch existing answers
            evaluation = AppraisalEvaluation.objects.filter(employee=target_emp, cycle=active_cycle).first()
            answers = []
            is_completed = False
            
            if evaluation:
                answers = AppraisalAnswer.objects.filter(evaluation=evaluation, question__role_type='hr')
                # If we have answers for all configured HR questions, mark as completed
                hr_questions_count = hr_questions.count()
                if hr_questions_count > 0 and answers.count() >= hr_questions_count:
                    is_completed = True
            
            # Map questions to their answers
            answers_map = {ans.question_id: ans for ans in answers}
            
            questions_data = []
            for q in hr_questions:
                ans = answers_map.get(q.id)
                questions_data.append({
                    "id": q.id,
                    "question_text": q.question_text,
                    "question_type": q.question_type,
                    "max_score": q.max_score,
                    "rating_score": float(ans.rating_score) if ans and ans.rating_score is not None else None,
                    "comment": ans.comment if ans else ""
                })
                
            return Response({
                "is_completed": is_completed,
                "questions": questions_data
            })

        # 4. Otherwise, return list of employees and their HR appraisal status
        employees = Employee.objects.filter(is_active=True, user__role='employee').select_related(
            'department', 'designation'
        )
        
        evaluations = AppraisalEvaluation.objects.filter(cycle=active_cycle).prefetch_related('answers__question')
        eval_map = {ev.employee_id: ev for ev in evaluations}
        
        hr_questions_count = AppraisalQuestion.objects.filter(cycle=active_cycle, role_type='hr').count()
        
        data = []
        for emp in employees:
            ev = eval_map.get(emp.id)
            is_completed = False
            if ev and hr_questions_count > 0:
                hr_ans_count = ev.answers.filter(question__role_type='hr').count()
                if hr_ans_count >= hr_questions_count:
                    is_completed = True
            
            data.append({
                'id': emp.id,
                'employee_id': emp.employee_id,
                'full_name': f"{emp.first_name} {emp.last_name}".strip(),
                'department_name': emp.department.department_name if emp.department else None,
                'designation_name': emp.designation.designation_name if emp.designation else None,
                'initials': ((emp.first_name or '')[:1] + (emp.last_name or '')[:1]).upper(),
                'status': 'Completed' if is_completed else 'Pending'
            })
            
        return Response(data)

    def post(self, request):
        if not (request.user.is_staff or getattr(request.user, 'role', '') in ['admin', 'hr']):
            raise PermissionDenied("You do not have permission to submit HR appraisals.")

        active_cycle = AppraisalCycle.objects.filter(status='active').first()
        if not active_cycle:
            return Response({"detail": "There is no active appraisal cycle configured."}, status=400)

        employee_id = request.data.get('employee_id')
        answers_data = request.data.get('answers', [])
        
        if not employee_id:
            return Response({"detail": "employee_id is required."}, status=400)
            
        target_emp = get_object_or_404(Employee, id=employee_id)
        
        # Get or create evaluation
        evaluation, _ = AppraisalEvaluation.objects.get_or_create(
            employee=target_emp, cycle=active_cycle, defaults={'status': 'draft'}
        )
        
        # Determine manager
        if not evaluation.manager:
            evaluation.manager = target_emp.reporting_manager
            evaluation.save(update_fields=['manager'])
            
        try:
            reviewer = request.user.employee_profile
        except Exception:
            return Response({"detail": "Reviewer employee profile required."}, status=403)

        # Save answers
        for ans in answers_data:
            q_id = ans.get('question_id')
            rating = ans.get('rating_score')
            comment = ans.get('comment', '')
            
            question = get_object_or_404(AppraisalQuestion, id=q_id, cycle=active_cycle, role_type='hr')
            
            AppraisalAnswer.objects.update_or_create(
                evaluation=evaluation,
                question=question,
                submitted_by=reviewer,
                defaults={
                    'rating_score': rating,
                    'comment': comment
                }
            )
            
        # Recalculate HR overall rating if there are ratings
        hr_answers = AppraisalAnswer.objects.filter(evaluation=evaluation, question__role_type='hr')
        ratings = [float(a.rating_score) for a in hr_answers if a.rating_score is not None]
        if ratings:
            evaluation.hr_overall_rating = sum(ratings) / len(ratings)
            
        # Update evaluation status
        evaluation.status = 'completed'
        evaluation.save()
        
        return Response({"success": True})
