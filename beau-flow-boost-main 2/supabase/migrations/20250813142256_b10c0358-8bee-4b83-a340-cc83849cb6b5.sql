-- Sample data for BrandVX Beauty Automation Platform
-- This creates realistic test data for development and testing

-- First, let's insert some sample contacts
INSERT INTO public.contacts (id, user_id, name, email, phone, status, tags, sources, consent_flags) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', auth.uid(), 'Sarah Johnson', 'sarah.johnson@email.com', '+1-555-0101', 'client', ARRAY['vip', 'facial', 'referral'], ARRAY['instagram', 'referral'], '{"marketing": true, "sms": true, "email": true}'::jsonb),
  ('550e8400-e29b-41d4-a716-446655440002', auth.uid(), 'Emily Chen', 'emily.chen@email.com', '+1-555-0102', 'lead', ARRAY['new', 'botox'], ARRAY['google_ads'], '{"marketing": true, "sms": false, "email": true}'::jsonb),
  ('550e8400-e29b-41d4-a716-446655440003', auth.uid(), 'Jessica Martinez', 'jessica.m@email.com', '+1-555-0103', 'client', ARRAY['regular', 'massage'], ARRAY['facebook'], '{"marketing": true, "sms": true, "email": true}'::jsonb),
  ('550e8400-e29b-41d4-a716-446655440004', auth.uid(), 'Amanda Wilson', 'amanda.wilson@email.com', '+1-555-0104', 'prospect', ARRAY['consultation'], ARRAY['website'], '{"marketing": false, "sms": false, "email": true}'::jsonb),
  ('550e8400-e29b-41d4-a716-446655440005', auth.uid(), 'Rachel Davis', 'rachel.davis@email.com', '+1-555-0105', 'client', ARRAY['vip', 'dermaplaning'], ARRAY['referral'], '{"marketing": true, "sms": true, "email": true}'::jsonb);

-- Sample appointments
INSERT INTO public.appointments (id, contact_id, service, staff, start_ts, end_ts, status, source, external_ref) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Hydrafacial', 'Sarah M.', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '1 hour', 'booked', 'acuity', 'ACU_12345'),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Botox Consultation', 'Dr. Smith', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '30 minutes', 'booked', 'acuity', 'ACU_12346'),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Deep Tissue Massage', 'Maria L.', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '1 hour', 'booked', 'square', 'SQ_78901'),
  ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'Dermaplaning', 'Sarah M.', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '45 minutes', 'booked', 'acuity', 'ACU_12347');

-- Sample inventory items
INSERT INTO public.inventory_items (id, user_id, name, sku, qty, thresholds) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', auth.uid(), 'Hydrating Serum', 'HS-001', 25, '{"low": 10, "critical": 5}'::jsonb),
  ('750e8400-e29b-41d4-a716-446655440002', auth.uid(), 'Vitamin C Cleanser', 'VC-002', 12, '{"low": 15, "critical": 8}'::jsonb),
  ('750e8400-e29b-41d4-a716-446655440003', auth.uid(), 'Anti-Aging Cream', 'AAC-003', 8, '{"low": 12, "critical": 5}'::jsonb),
  ('750e8400-e29b-41d4-a716-446655440004', auth.uid(), 'Botox Units', 'BTX-004', 150, '{"low": 50, "critical": 25}'::jsonb),
  ('750e8400-e29b-41d4-a716-446655440005', auth.uid(), 'Disposable Gloves', 'DG-005', 180, '{"low": 100, "critical": 50}'::jsonb);

-- Sample revenue records
INSERT INTO public.revenue_records (id, user_id, amount, currency, source, pos_ref) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', auth.uid(), 150.00, 'USD', 'square', 'SQ_PAY_001'),
  ('850e8400-e29b-41d4-a716-446655440002', auth.uid(), 450.00, 'USD', 'square', 'SQ_PAY_002'),
  ('850e8400-e29b-41d4-a716-446655440003', auth.uid(), 120.00, 'USD', 'square', 'SQ_PAY_003'),
  ('850e8400-e29b-41d4-a716-446655440004', auth.uid(), 300.00, 'USD', 'acuity', 'ACU_PAY_001'),
  ('850e8400-e29b-41d4-a716-446655440005', auth.uid(), 200.00, 'USD', 'square', 'SQ_PAY_004');

-- Sample cadence templates
INSERT INTO public.cadence_templates (id, user_id, name, channel, template_body, trigger_type, trigger_conditions, personalization_fields) VALUES
  ('950e8400-e29b-41d4-a716-446655440001', auth.uid(), 'Welcome New Client', 'email', 'Hi {{FIRST_NAME}}, Welcome to our beauty studio! We''re excited to help you achieve your skincare goals. Your consultation is scheduled for {{APPOINTMENT_DATE}}. See you soon!', 'event_based', '{"event": "new_contact", "delay_hours": 1}'::jsonb, ARRAY['FIRST_NAME', 'APPOINTMENT_DATE']),
  ('950e8400-e29b-41d4-a716-446655440002', auth.uid(), 'Post-Treatment Follow-up', 'sms', 'Hi {{FIRST_NAME}}! How are you feeling after your {{SERVICE_NAME}}? Any questions? Reply with any concerns. We''re here to help! 💆‍♀️', 'time_based', '{"delay_days": 1, "after_event": "appointment_completed"}'::jsonb, ARRAY['FIRST_NAME', 'SERVICE_NAME']),
  ('950e8400-e29b-41d4-a716-446655440003', auth.uid(), 'Monthly Skincare Tips', 'email', 'Hi {{FIRST_NAME}}, Here are this month''s skincare tips from our experts! Remember to stay consistent with your routine. Book your next appointment: {{BOOKING_LINK}}', 'time_based', '{"frequency": "monthly", "send_day": 1}'::jsonb, ARRAY['FIRST_NAME', 'BOOKING_LINK']);

-- Sample AI recommendations
INSERT INTO public.ai_recommendations (id, user_id, title, description, recommendation_type, priority, status, action_data, expires_at) VALUES
  ('a50e8400-e29b-41d4-a716-446655440001', auth.uid(), 'Restock Vitamin C Cleanser', 'Your Vitamin C Cleanser inventory is running low (12 units). Consider reordering 20+ units to avoid stockouts.', 'inventory_alert', 8, 'pending', '{"item_id": "750e8400-e29b-41d4-a716-446655440002", "suggested_quantity": 25}'::jsonb, NOW() + INTERVAL '7 days'),
  ('a50e8400-e29b-41d4-a716-446655440002', auth.uid(), 'Follow up with Emily Chen', 'Emily Chen expressed interest in Botox but hasn''t booked yet. Consider sending a personalized follow-up with special offer.', 'lead_nurture', 7, 'pending', '{"contact_id": "550e8400-e29b-41d4-a716-446655440002", "suggested_action": "send_follow_up"}'::jsonb, NOW() + INTERVAL '3 days'),
  ('a50e8400-e29b-41d4-a716-446655440003', auth.uid(), 'Schedule Sarah Johnson''s Next Facial', 'Sarah Johnson is due for her monthly Hydrafacial. She typically books 3-4 weeks apart.', 'appointment_reminder', 6, 'pending', '{"contact_id": "550e8400-e29b-41d4-a716-446655440001", "service": "Hydrafacial"}'::jsonb, NOW() + INTERVAL '5 days');

-- Sample lead status records
INSERT INTO public.lead_status (id, contact_id, bucket, tag, reason, next_action_at) VALUES
  ('b50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 1, 'warm', 'Showed interest in Botox consultation during phone call', NOW() + INTERVAL '2 days'),
  ('b50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 2, 'nurturing', 'Downloaded skincare guide, need to follow up with consultation offer', NOW() + INTERVAL '3 days');

-- Sample events for analytics
INSERT INTO public.events (id, user_id, type, source, metadata) VALUES
  ('c50e8400-e29b-41d4-a716-446655440001', auth.uid(), 'appointment_booked', 'acuity', '{"contact_id": "550e8400-e29b-41d4-a716-446655440001", "service": "Hydrafacial", "value": 150}'::jsonb),
  ('c50e8400-e29b-41d4-a716-446655440002', auth.uid(), 'contact_added', 'manual', '{"contact_id": "550e8400-e29b-41d4-a716-446655440002", "source": "google_ads"}'::jsonb),
  ('c50e8400-e29b-41d4-a716-446655440003', auth.uid(), 'revenue_generated', 'square', '{"amount": 450, "contact_id": "550e8400-e29b-41d4-a716-446655440002", "service": "Botox"}'::jsonb),
  ('c50e8400-e29b-41d4-a716-446655440004', auth.uid(), 'inventory_low', 'system', '{"item_id": "750e8400-e29b-41d4-a716-446655440002", "current_qty": 12, "threshold": 15}'::jsonb);

-- Sample time analysis data
INSERT INTO public.time_analysis (id, user_id, current_hours_per_week, projected_hours_per_week, weekly_savings_dollars, analysis_data) VALUES
  ('d50e8400-e29b-41d4-a716-446655440001', auth.uid(), 45, 32, 650, '{
    "tasks_automated": ["Appointment reminders", "Follow-up messages", "Inventory alerts", "Lead nurturing"],
    "efficiency_gains": {"scheduling": 4.5, "marketing": 3.2, "inventory": 2.8, "admin": 2.5},
    "cost_breakdown": {"automation_tools": 150, "time_saved_value": 800, "net_benefit": 650}
  }'::jsonb);

-- Sample milestones
INSERT INTO public.milestones (id, user_id, name, data) VALUES
  ('e50e8400-e29b-41d4-a716-446655440001', auth.uid(), 'First Month Complete', '{"total_contacts": 25, "appointments_booked": 12, "revenue": 2500}'::jsonb),
  ('e50e8400-e29b-41d4-a716-446655440002', auth.uid(), 'Automation Setup', '{"cadences_created": 5, "integrations_connected": 3, "time_saved_hours": 15}'::jsonb);