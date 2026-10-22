package com.jinriyouxu.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;

@CapacitorPlugin(name="BackupExport")
public class BackupExportPlugin extends Plugin {
    private volatile boolean exporting=false;
    @PluginMethod public void save(PluginCall call) {
        if(exporting) { call.reject("已有备份正在保存"); return; }
        try {
            Uri uri=Uri.parse(call.getString("uri", ""));
            File source=new File(uri.getPath()==null ? "" : uri.getPath()).getCanonicalFile();
            File folder=new File(getContext().getCacheDir(),"backups").getCanonicalFile();
            if(!"file".equals(uri.getScheme()) || !source.getPath().startsWith(folder.getPath()+File.separator) || !source.isFile()) throw new IOException("无效的备份源文件");
            call.getData().put("sourcePath",source.getPath());
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType(call.getString("mime","application/zip")).putExtra(Intent.EXTRA_TITLE,call.getString("name","youxu-backup.zip"));
            exporting=true;
            startActivityForResult(call,intent,"backupSaved");
        } catch(Exception error) { exporting=false; call.reject("无法打开备份保存位置",error); }
    }
    @ActivityCallback private void backupSaved(PluginCall call, ActivityResult result) {
        if(call==null) { exporting=false; return; }
        Uri destination=result.getData()==null ? null : result.getData().getData();
        if(result.getResultCode()!=Activity.RESULT_OK || destination==null) { exporting=false; call.resolve(new JSObject().put("status","cancelled")); return; }
        new Thread(() -> {
            try(InputStream input=new FileInputStream(call.getString("sourcePath"));
                OutputStream output=getContext().getContentResolver().openOutputStream(destination,"wt")) {
                if(output==null) throw new IOException("保存位置不可写");
                byte[] buffer=new byte[65536]; int length;
                while((length=input.read(buffer))!=-1) output.write(buffer,0,length);
                output.flush();
            } catch(Exception error) { exporting=false; call.reject("备份写入失败，请重新导出",error); return; }
            exporting=false;
            call.resolve(new JSObject().put("status","saved"));
        },"youxu-backup-export").start();
    }
}
