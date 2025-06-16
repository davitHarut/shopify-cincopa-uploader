import {useEffect, useRef} from 'react';

export default function Uploader() {
  const uploaderRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://wwwcdn.cincopa.com/_cms/ugc/uploaderui.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.cpUploadUI && uploaderRef.current) {
        const uploadUI = new cpUploadUI(uploaderRef.current, {
          upload_url: "https://mediaupload.cincopa.com/post.jpg?uid=230692&d=AAAAcAAJFOAAAAAAAAtAURG&hash=dpuo31hhzdqphu5desjwoc22pl4mszno&addtofid=0",
          multiple: false,
          width: "auto",
          height: "auto",
          onUploadComplete: function (data) {
            if (data.uploadState === "Complete" && data.rid) {
              console.log("Upload completed:", data.rid);
            }
          },
        });

        uploadUI.start();
      }
    };
  }, []);

  return (
    <div style={{padding: 20}}>
      <h1>Cincopa Uploader</h1>
      <div ref={uploaderRef} style={{minHeight: '300px'}} />
    </div>
  );
}
