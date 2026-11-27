const usernameEl = document.getElementById("accountUsername");
const emailEl = document.getElementById("accountEmail");
const statusEl = document.getElementById("accountStatus");
const signOutButton = document.getElementById("signOut");
const deleteDialog = document.getElementById("deleteAccountDialog");
const openDeleteButton = document.getElementById("openDeleteAccount");
const cancelDeleteButton = document.getElementById("cancelDeleteAccount");
const deleteForm = document.getElementById("deleteAccountForm");
const deletePasswordInput = document.getElementById("deleteAccountPassword");
const deleteConfirmInput = document.getElementById("deleteAccountConfirm");
const deleteStatus = document.getElementById("deleteAccountStatus");
const deleteSubmitButton = document.getElementById("confirmDeleteAccount");
let currentAccountUser = null;

(async () => {
  try {
    await window.cvAuthReady;
    const { data: { session }, error: sessionError } = await cvSupabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) {
      location.replace("auth.html");
      return;
    }
    const { data: { user }, error: userError } = await cvSupabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      location.replace("auth.html");
      return;
    }
    currentAccountUser = user;
    const username = user.user_metadata?.username || user.user_metadata?.display_name;
    usernameEl.textContent = username || "CineVerse member";
    emailEl.textContent = user.email || "Email unavailable";
    statusEl.textContent = "Your account is active.";
  } catch (error) {
    console.warn("CineVerse account session check failed:", error);
    statusEl.textContent = "We couldn't verify your session. Please refresh the page or sign in again.";
  }
})();

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  const { error } = await cvSupabase.auth.signOut();
  if (error) {
    statusEl.textContent = error.message;
    signOutButton.disabled = false;
    return;
  }
  location.href = "auth.html";
});

openDeleteButton.addEventListener("click", () => {
  deleteStatus.textContent = "";
  deletePasswordInput.value = "";
  deleteConfirmInput.value = "";
  deleteDialog.showModal();
  deletePasswordInput.focus();
});

cancelDeleteButton.addEventListener("click", () => {
  deleteDialog.close();
  deletePasswordInput.value = "";
  deleteConfirmInput.value = "";
});

deleteForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentAccountUser?.email) {
    deleteStatus.textContent = "Please sign in again before deleting your account.";
    return;
  }
  if (deleteConfirmInput.value.trim() !== "DELETE") {
    deleteStatus.textContent = "Type DELETE exactly to confirm.";
    deleteConfirmInput.focus();
    return;
  }

  deleteSubmitButton.disabled = true;
  cancelDeleteButton.disabled = true;
  deleteStatus.textContent = "Verifying your password…";
  try {
    const { error: reauthError } = await cvSupabase.auth.signInWithPassword({
      email: currentAccountUser.email,
      password: deletePasswordInput.value
    });
    if (reauthError) throw new Error("That password wasn't correct. Please try again.");

    deleteStatus.textContent = "Deleting your account…";
    const { error: deleteError } = await cvSupabase.functions.invoke("delete-account", {
      method: "POST"
    });
    if (deleteError) throw deleteError;

    deleteStatus.textContent = "Your account has been deleted.";
    await cvSupabase.auth.signOut({ scope: "local" });
    location.replace("index.html");
  } catch (error) {
    console.warn("CineVerse account deletion failed:", error);
    deleteStatus.textContent = error.message || "We couldn't delete your account. Please try again.";
    deleteSubmitButton.disabled = false;
    cancelDeleteButton.disabled = false;
    deletePasswordInput.value = "";
    deletePasswordInput.focus();
  }
});
