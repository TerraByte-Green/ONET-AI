-- Spreadsheet-shaped views over the normalized O*NET tables.
-- Each v_<table> rebuilds the columns of the matching O*NET file, with the
-- titles, element names and scale names joined back in.

-- Ratings with full survey statistics ---------------------------------------

create view onet.v_abilities with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.not_relevant, t.date_updated, t.domain_source
from onet.abilities t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

create view onet.v_essential_skills with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.not_relevant, t.date_updated, t.domain_source
from onet.essential_skills t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

create view onet.v_transferable_skills with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.not_relevant, t.date_updated, t.domain_source
from onet.transferable_skills t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

create view onet.v_knowledge with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.not_relevant, t.date_updated, t.domain_source
from onet.knowledge t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

create view onet.v_work_activities with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.not_relevant, t.date_updated, t.domain_source
from onet.work_activities t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

create view onet.v_work_context with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.category, c.category_description,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.not_relevant, t.date_updated, t.domain_source
from onet.work_context t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id)
left join onet.work_context_categories c using (element_id, scale_id, category);

create view onet.v_education with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.category, c.category_description,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.date_updated, t.domain_source
from onet.education t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id)
left join onet.education_categories c using (element_id, scale_id, category);

create view onet.v_training_experience with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.category, c.category_description,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.date_updated, t.domain_source
from onet.training_experience t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id)
left join onet.training_experience_categories c using (element_id, scale_id, category);

-- Ratings without survey statistics ------------------------------------------

create view onet.v_career_interest_types with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.date_updated, t.domain_source
from onet.career_interest_types t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

create view onet.v_specific_interest_areas with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.date_updated, t.domain_source
from onet.specific_interest_areas t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

create view onet.v_work_styles with (security_invoker = true) as
select onetsoc_code, o.title, element_id, e.element_name, scale_id, s.scale_name,
       t.data_value, t.date_updated, t.domain_source
from onet.work_styles t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id)
join onet.scales_reference s using (scale_id);

-- Tasks -----------------------------------------------------------------------

create view onet.v_task_statements with (security_invoker = true) as
select onetsoc_code, o.title, t.task_id, t.task, t.task_type, t.incumbents_responding,
       t.date_updated, t.domain_source
from onet.task_statements t
join onet.occupation_data o using (onetsoc_code);

create view onet.v_task_ratings with (security_invoker = true) as
select onetsoc_code, o.title, task_id, ts.task, scale_id, s.scale_name,
       t.category, c.category_description,
       t.data_value, t.n, t.standard_error, t.lower_ci_bound, t.upper_ci_bound,
       t.recommend_suppress, t.date_updated, t.domain_source
from onet.task_ratings t
join onet.occupation_data o using (onetsoc_code)
join onet.task_statements ts using (onetsoc_code, task_id)
join onet.scales_reference s using (scale_id)
left join onet.task_categories c using (scale_id, category);

create view onet.v_tasks_to_dwas with (security_invoker = true) as
select onetsoc_code, o.title, task_id, ts.task, t.dwa_id, e.element_name as dwa_name,
       t.date_updated, t.domain_source
from onet.tasks_to_dwas t
join onet.occupation_data o using (onetsoc_code)
join onet.task_statements ts using (onetsoc_code, task_id)
join onet.content_model_reference e on e.element_id = t.dwa_id;

create view onet.v_emerging_tasks with (security_invoker = true) as
select t.onetsoc_code, o.title, t.task, t.category, t.original_task_id, ts.task as original_task,
       t.date_updated, t.domain_source
from onet.emerging_tasks t
join onet.occupation_data o on o.onetsoc_code = t.onetsoc_code
left join onet.task_statements ts on ts.task_id = t.original_task_id;

-- Work activity hierarchy ------------------------------------------------------

create view onet.v_gwa_iwa_dwa with (security_invoker = true) as
select i.gwa_id, g.element_name as gwa_name,
       i.iwa_id, iw.element_name as iwa_name,
       d.dwa_id, dw.element_name as dwa_name
from onet.dwa_reference d
join onet.iwa_reference i using (iwa_id)
join onet.content_model_reference g on g.element_id = i.gwa_id
join onet.content_model_reference iw on iw.element_id = i.iwa_id
join onet.content_model_reference dw on dw.element_id = d.dwa_id;

create view onet.v_element_crosswalk with (security_invoker = true) as
select x.crosswalk, x.from_element_id, f.element_name as from_element_name,
       x.to_element_id, t.element_name as to_element_name
from onet.element_crosswalk x
join onet.content_model_reference f on f.element_id = x.from_element_id
join onet.content_model_reference t on t.element_id = x.to_element_id;

-- Other occupation-level data ---------------------------------------------------

create view onet.v_job_zones with (security_invoker = true) as
select onetsoc_code, o.title, job_zone, r.name as job_zone_name, t.date_updated, t.domain_source
from onet.job_zones t
join onet.occupation_data o using (onetsoc_code)
join onet.job_zone_reference r using (job_zone);

create view onet.v_job_titles with (security_invoker = true) as
select onetsoc_code, o.title, t.job_title, t.short_title, t.sources
from onet.job_titles t
join onet.occupation_data o using (onetsoc_code);

create view onet.v_related_occupations with (security_invoker = true) as
select t.onetsoc_code, o.title, t.related_onetsoc_code, r.title as related_title,
       t.relatedness_tier, t.related_index
from onet.related_occupations t
join onet.occupation_data o on o.onetsoc_code = t.onetsoc_code
join onet.occupation_data r on r.onetsoc_code = t.related_onetsoc_code;

create view onet.v_software_skills with (security_invoker = true) as
select onetsoc_code, o.title, t.workplace_example, element_id, e.element_name,
       t.hot_technology, t.in_demand
from onet.software_skills t
join onet.occupation_data o using (onetsoc_code)
join onet.content_model_reference e using (element_id);
