// Única puerta de entrada a Supabase. Toda la lógica sensible (calificar, sumar horas, equipos)
// vive en funciones del servidor; aquí solo se llaman.
import { CONFIG } from "./config.js";

export const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
});

const must = ({ data, error }) => { if (error) throw error; return data; };
const appUrl = () => location.origin + location.pathname;

export const Auth = {
  session: async () => (await sb.auth.getSession()).data.session,
  signUp: (email, password, displayName) => sb.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: appUrl() } }).then(must),
  signIn: (email, password) => sb.auth.signInWithPassword({ email, password }).then(must),
  resetPassword: email => sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() }).then(must),
  updatePassword: password => sb.auth.updateUser({ password }).then(must),
  signOut: () => sb.auth.signOut(),
  onChange: cb => sb.auth.onAuthStateChange(cb)
};

export const Api = {
  courses: () => sb.from("courses").select("id,name,hours,track,sort,ai,topic,org,url,learn,detail,modules").order("sort").then(must),
  myProfile: uid => sb.from("profiles").select("*").eq("id", uid).single().then(must),
  saveProfile: (uid, fields) => sb.from("profiles").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", uid).then(must),
  // RLS solo devuelve mis filas y las de mi equipo
  profiles: () => sb.from("profiles").select("id,display_name,avatar,profile_type,hours_per_week,start_date,configured,ais").then(must),
  mastery: () => sb.from("module_mastery").select("user_id,course_id,module_idx,best_score,total,perfect,xp,hours_credited,passed_at").then(must),
  training: () => sb.from("training_results").select("user_id,activity,item_id,score,max_score,payload,created_at").then(must),
  addTraining: t => sb.from("training_results").insert(t).then(must),
  myTeam: () => sb.from("teams").select("id,name,invite_code,owner_id,ais").maybeSingle().then(must),
  teamMembers: () => sb.from("team_members").select("user_id,role,joined_at").then(must),
  createTeam: name => sb.rpc("create_team", { p_name: name }).then(must),
  joinTeam: code => sb.rpc("join_team", { p_code: code }).then(must),
  leaveTeam: () => sb.rpc("leave_team").then(must),
  regenerateInvite: () => sb.rpc("regenerate_invite").then(must),
  setTeamAis: ais => sb.rpc("set_team_ais", { p_ais: ais }).then(must),
  startLesson: (course, module) => sb.rpc("start_lesson", { p_course: course, p_module: module }).then(must),
  checkAnswer: (session, question, option) => sb.rpc("check_answer", { p_session: session, p_question: question, p_option: option }).then(must),
  finishLesson: session => sb.rpc("finish_lesson", { p_session: session }).then(must)
};
