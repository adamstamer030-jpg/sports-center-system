const { contextBridge, ipcRenderer } = require('electron');

// واجهة واحدة موحّدة: window.api.invoke(channel, payload)
// أي موديول جديد (HR, Billing, Inventory..) هيستخدم نفس النمط ده تمامًا
//
// ملحوظة مهمة: هذا الملف لازم يكون .cjs (CommonJS) لا .js — لأن Electron
// بيتجاهل "type": "module" تمامًا بالنسبة لـ preload scripts، وبيحمّلها
// كـ CommonJS دايمًا إلا لو كان امتداد الملف .mjs (وده له قيود تانية مع
// sandbox). استخدام require() هنا هو الطريقة المضمونة اللي بتشتغل في كل
// إصدارات Electron وسواء كان sandbox: true أو false.
// مرجع: https://www.electronjs.org/docs/latest/tutorial/esm
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
  },
});
