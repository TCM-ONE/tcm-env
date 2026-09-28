import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Share,
  Linking
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getDoubtRoomDetails,
  sendDoubtRoomMessage,
  askAiDoubt,
  createDoubtRoomPoll,
  voteDoubtRoomPoll,
  markDoubtRoomSolved,
  joinDoubtRoom,
  manageDoubtRoom,
  uploadImageToServer,
  uploadFile
} from "../api/client";
import RoomDetailsScreen from "./RoomDetailsScreen";
import { useTheme } from "../context/ThemeContext";
import { fonts } from "../constants/fonts";
import { fileToDataUri } from "../utils/fileUtils";

const phlappyLogo = require("../../assets/icon.png");

function generateClientSmartFallback(query, category = "Academic") {
  const text = (query || "").toLowerCase().trim();
  const rawTopic = query.replace(/(sir|bhai|mujhe|tell me|explain|what is|how to|about|ke bare me|batao|bataye|\?)/gi, '').trim() || 'Programming & Academic Doubt';

  if (text.includes("python")) {
    return `🐍 **Python Explanation by Phlappy AI**\n\nPython ek simple, powerful aur high-level programming language hai! Web development, AI, automation aur data analysis me python widely use hoti hai.\n\n### 🎯 Key Highlights:\n- **Simple Syntax**: English jaisa readable code.\n- **Versatile**: Web apps (Django/Flask), AI/ML (TensorFlow, PyTorch) me use hota hai.\n- **Dynamically Typed**: Variables ka type manually declare nahi karna padta.\n\n\`\`\`python\n# Simple Python Example\ndef greet_student(name):\n    return f"Hello {name}, welcome to Phlappy AI Learning!"\n\nprint(greet_student("Aman"))\n\`\`\`\n\n🚀 **Next Step**: Pehle basic variables, loops aur functions ki practice karo!`;
  }

  if (text.includes("django")) {
    return `🎓 **Django Overview by Phlappy AI**\n\nDjango ek powerful Python Web Framework hai jo **MVT Architecture** (Model, View, Template) use karta hai.\n\n- **Model**: Database schema define karta hai.\n- **View**: API and Business Logic handle karta hai.\n- **Template**: HTML UI render karta hai.\n\n\`\`\`python\nfrom django.http import JsonResponse\n\ndef my_api_view(request):\n    return JsonResponse({"message": "Hello from Phlappy AI & Django!"})\n\`\`\``;
  }

  if (text.includes("react") || text.includes("javascript") || text.includes("js")) {
    return `⚡ **React & JavaScript Guide by Phlappy AI**\n\nReact ek declarative, component-based UI library hai jo modern web and mobile apps (React Native) me use hoti hai.\n\n- **Virtual DOM**: Fast updates aur re-rendering compute karta hai.\n- **Hooks**: \`useState\` and \`useEffect\` se state and side effects manage hote hain.\n\n\`\`\`javascript\nimport React, { useState } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>Clicks: {count}</button>;\n}\n\`\`\``;
  }

  return `🤖 **Phlappy AI Quick Guide on "${rawTopic}"**\n\nAapke question **"${query}"** ka key breakdown:\n\n1. **Core Idea**: Pehle basic concepts aur inputs ko clear samjho.\n2. **Practical Approach**: Logic ko step-by-step modular code ya clean solution me break karo.\n3. **Best Practice**: Output check karo aur edge cases handle karo.\n\nAgar koi specific doubt ho ya code sample chahiye, to text me specify karke puch sakte ho! 🚀`;
}

function renderAiFormattedResponse(rawText, theme = {}) {
  if (!rawText) return null;
  const isDark = Boolean(theme?.isDark);
  const textColor = theme?.text || (isDark ? "#F8FAFC" : "#334155");
  const textStyleMain = { fontSize: 13, color: textColor, lineHeight: 19 };

  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  const elements = [];
  let lastIndex = 0;
  let match;
  let keyCount = 0;

  const renderInlineFormatted = (inlineStr, textStyle = textStyleMain) => {
    if (!inlineStr) return null;
    // Strip leading header symbols or bullet hashes
    let cleanStr = inlineStr.replace(/^#+\s*/, "").trim();
    if (!cleanStr) return null;

    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    const parts = cleanStr.split(regex);

    return parts.map((part, idx) => {
      if (!part) return null;

      // Bold text **text**
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        const clean = part.slice(2, -2).replace(/[\*#]/g, "").trim();
        return (
          <Text key={idx} style={[textStyle, { fontWeight: "700", color: theme?.text || (isDark ? "#FFFFFF" : "#0F172A") }]}>
            {clean}
          </Text>
        );
      }

      // Code inline `code`
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        const clean = part.slice(1, -1);
        return (
          <Text key={idx} style={{ backgroundColor: isDark ? "#1E263B" : "#E2E8F0", color: theme?.primary || "#6366F1", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 12, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
            {clean}
          </Text>
        );
      }

      // Italic text *text*
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        const clean = part.slice(1, -1).replace(/[\*#]/g, "").trim();
        return (
          <Text key={idx} style={[textStyle, { fontStyle: "italic" }]}>
            {clean}
          </Text>
        );
      }

      // Plain text: strip lingering raw * or # characters completely
      const cleanPart = part.replace(/[\*#]/g, "");
      return <Text key={idx} style={textStyle}>{cleanPart}</Text>;
    });
  };

  const processTextBlock = (textBlock) => {
    const lines = textBlock.split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<View key={`sp_${keyCount++}`} style={{ height: 4 }} />);
        return;
      }

      if (/^(=+|-+|\*+)$/.test(trimmed)) {
        elements.push(<View key={`hr_${keyCount++}`} style={{ height: 1, backgroundColor: theme?.border || "#E2E8F0", marginVertical: 8, width: "100%" }} />);
        return;
      }

      const isHeader = /^#+\s+/.test(trimmed) || (trimmed.startsWith("**") && (trimmed.endsWith("**") || trimmed.includes(":")));

      if (isHeader) {
        const headerText = trimmed.replace(/^#+\s*/, "");
        elements.push(
          <View key={`hdr_${keyCount++}`} style={{ marginTop: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 13.5, fontWeight: "700", color: theme?.text || (isDark ? "#FFFFFF" : "#0F172A"), lineHeight: 19 }}>
              {renderInlineFormatted(headerText)}
            </Text>
          </View>
        );
      } else if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("* ")) {
        const bulletText = trimmed.replace(/^([•\-\*]\s*)/, "");
        elements.push(
          <View key={`blt_${keyCount++}`} style={{ flexDirection: "row", marginTop: 2, marginBottom: 2, paddingLeft: 2 }}>
            <Text style={{ fontSize: 13, color: theme?.primary || "#6366F1", marginRight: 6 }}>•</Text>
            <Text style={{ flex: 1, fontSize: 13, color: textColor, lineHeight: 19 }}>
              {renderInlineFormatted(bulletText, { fontSize: 13, color: textColor, lineHeight: 19 })}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <Text key={`txt_${keyCount++}`} style={{ fontSize: 13, color: textColor, lineHeight: 19, marginBottom: 3 }}>
            {renderInlineFormatted(trimmed, { fontSize: 13, color: textColor, lineHeight: 19 })}
          </Text>
        );
      }
    });
  };

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      processTextBlock(rawText.substring(lastIndex, match.index));
    }
    const lang = match[1] || "CODE";
    const codeContent = match[2].trim();
    elements.push(
      <View key={`code_${keyCount++}`} style={[styles.aiCodeContainer, { backgroundColor: isDark ? "#0F172A" : "#F1F5F9", borderColor: theme?.border || "#CBD5E1" }]}>
        <View style={[styles.aiCodeHeader, { backgroundColor: isDark ? "#1E263B" : "#E2E8F0" }]}>
          <Text style={[styles.aiCodeLangText, { color: theme?.primary || "#5B3CF5" }]}>{lang.toUpperCase()}</Text>
          <MaterialCommunityIcons name="code-tags" size={14} color={theme?.primary || "#5B3CF5"} />
        </View>
        <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }} showsVerticalScrollIndicator>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={[styles.aiCodeText, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>{codeContent}</Text>
          </ScrollView>
        </ScrollView>
      </View>
    );
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    processTextBlock(rawText.substring(lastIndex));
  }

  return <View style={{ width: "100%" }}>{elements}</View>;
}

function CollapsibleMessageContainer({ item, children }) {
  const { theme } = useTheme();
  const isLong = (item?.text || "").length > 180 || (item?.text || "").includes("\n\n");
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[
      styles.bubbleLeft,
      { backgroundColor: theme.cardBg, borderColor: theme.border },
      item?.isAi && [styles.bubbleAi, { backgroundColor: theme.isDark ? "#111827" : "#F8FAFC", borderColor: theme.border }]
    ]}>
      <View style={isLong && !expanded ? { maxHeight: 150, overflow: "hidden" } : undefined}>
        {children}
      </View>

      {isLong ? (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.badgeBg,
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
            marginTop: 8,
            borderWidth: 1,
            borderColor: theme.border
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: theme.primary, marginRight: 4 }}>
            {expanded ? "Show Less ▲" : "Read Full Answer ▼"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function CollapsibleCodeSnippet({ code, lang = "JavaScript / Code" }) {
  const isLong = (code || "").split("\n").length > 5 || (code || "").length > 140;
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.codeSnippetBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLangText}>{lang}</Text>
        <TouchableOpacity onPress={() => Alert.alert("Copied", "Code snippet copied!")}>
          <Text style={styles.copyCodeText}>Copy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        nestedScrollEnabled
        style={{ maxHeight: expanded ? 400 : 120 }}
        showsVerticalScrollIndicator
      >
        <Text style={styles.codeContentText}>{code}</Text>
      </ScrollView>

      {isLong ? (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F1F5F9",
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 6,
            marginTop: 6,
            borderWidth: 1,
            borderColor: "#E2E8F0"
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#5B3CF5" }}>
            {expanded ? "Collapse Code ▲" : "Expand Full Code ▼"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function isQuestionMessage(item) {
  if (!item || item.isAi || item.type === "poll" || item.type === "ai_response") return false;
  return true;
}

async function generateDoubtAnswerWithLiveAI(query, category = "Academic") {
  const GROQ_API_KEY = "";
  const GROQ_MODELS = [
    "groq/compound-mini",
    "groq/compound",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b"
  ];

  const prompt = `You are Phlappy AI (TCM One Phlappy AI 🤖), a friendly, highly intelligent expert academic and coding tutor at TCM One Academy.

Student Query: "${query}"
Subject / Domain Category: "${category}"

INSTRUCTIONS FOR PHLAPPY AI:
1. Identify yourself as Phlappy AI if asked.
2. Adapt to the student's language naturally (Hinglish/Hindi/English). If the student asks in Hinglish (e.g. "Python smjhao", "kaise kare"), answer in clear, friendly Hinglish with code & bullet points!
3. DO NOT use rigid robotic headings like "Executive Concept Overview" or "Step 1 (Core Fundamentals)".
4. Give a direct, easy-to-understand, engaging explanation with real-world analogies, code examples with comments, and key tips.
5. Keep formatting clean using bold headings, code blocks, and bullet points.`;

  if (GROQ_API_KEY) {
    for (const modelName of GROQ_MODELS) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1800
          })
        });
        if (response.ok) {
          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (err) {
        console.warn(`Groq live AI model ${modelName} error:`, err);
      }
    }
  }
  return generateClientSmartFallback(query, category);
}

function dedupeRoomMessages(list) {
  if (!Array.isArray(list)) return [];
  const result = [];
  list.forEach((msg) => {
    if (!msg || (!msg.text && !msg.mediaUrl && !msg.question && msg.type !== "poll")) return;
    const isDup = result.some((existing, idx) => {
      if (existing.id && msg.id && existing.id === msg.id) {
        const hasVotedOpt = existing.type === "poll" && existing.options && existing.options.some((o) => o.isVoted);
        result[idx] = {
          ...existing,
          ...msg,
          options: hasVotedOpt ? existing.options : (msg.options || existing.options),
          totalVotes: hasVotedOpt ? Math.max(existing.totalVotes || 0, msg.totalVotes || 0) : (msg.totalVotes || existing.totalVotes),
          mediaUrl: existing.mediaUrl || msg.mediaUrl,
          mediaType: existing.mediaType || msg.mediaType,
          driveLink: existing.driveLink || msg.driveLink,
          fileName: existing.fileName || msg.fileName
        };
        return true;
      }
      const sameUser = String(existing.authorId || existing.senderId || "").trim() === String(msg.authorId || msg.senderId || "").trim();
      const sameText = String(existing.text || existing.question || "").trim() === String(msg.text || msg.question || "").trim();
      if (sameUser && sameText && sameText.length > 0) {
        const hasVotedOpt = existing.type === "poll" && existing.options && existing.options.some((o) => o.isVoted);
        result[idx] = {
          ...existing,
          ...msg,
          options: hasVotedOpt ? existing.options : (msg.options || existing.options),
          totalVotes: hasVotedOpt ? Math.max(existing.totalVotes || 0, msg.totalVotes || 0) : (msg.totalVotes || existing.totalVotes),
          mediaUrl: existing.mediaUrl || msg.mediaUrl,
          mediaType: existing.mediaType || msg.mediaType,
          driveLink: existing.driveLink || msg.driveLink,
          fileName: existing.fileName || msg.fileName
        };
        return true;
      }
      return false;
    });
    if (!isDup) {
      result.push(msg);
    }
  });
  return result;
}

export default function DoubtRoomScreen({ session, roomId = "NEET-DOUBT-001", onClose, onOpenMentorProfile, onOpenMentorChat }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Modals & Tools
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("Who wants to learn this topic again in a live session?");
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [codeSnippetText, setCodeSnippetText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Attachment Bottom Sheet & Media Upload State
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachType, setAttachType] = useState("image");
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [previewImageTitle, setPreviewImageTitle] = useState("");
  const [imageCaptionInput, setImageCaptionInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [driveLinkInput, setDriveLinkInput] = useState("");
  const [docTitleInput, setDocTitleInput] = useState("");
  const [fullImageModalUri, setFullImageModalUri] = useState(null);

  const sampleImagePresets = [
    { label: "Diagram Sample", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80" },
    { label: "Handwritten Notes", url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80" },
    { label: "Code Screenshot", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80" }
  ];

  const sampleDocPresets = [
    { label: "Academic Notes PDF", driveUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view", title: "NEET_Chapter_Notes.pdf" },
    { label: "Lab Formula Sheet", driveUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view", title: "Formula_Sheet_2026.pdf" }
  ];

  async function pickImageFromDevice() {
    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result;
              if (dataUrl) {
                handleSendAttachment({
                  type: "image",
                  url: dataUrl,
                  title: file.name || "Photo Attachment"
                });
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Needed", "Please grant access to your photo library to pick images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const imgUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        handleSendAttachment({
          type: "image",
          url: imgUri,
          title: "Device Gallery Photo"
        });
      }
    } catch (e) {
      Alert.alert("Photo Upload", "Opening file chooser...");
    }
  }

  async function pickDocFromDevice() {
    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.doc,.docx,.ppt,.pptx,.txt";
        input.onchange = (e) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const res = await uploadFile(session?.token, reader.result);
                handleSendAttachment({
                  type: "doc",
                  driveUrl: res?.url || "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
                  title: file.name || "Uploaded_Document.pdf"
                });
              } catch (err) {
                console.warn("Doc upload error:", err);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "text/*"],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets?.[0]) {
        const doc = result.assets[0];
        try {
          const dataUri = await fileToDataUri(doc);
          if (!dataUri) {
            Alert.alert("Upload Failed", "Could not read the selected document.");
            return;
          }
          const res = await uploadFile(session?.token, dataUri);
          if (!res?.url) {
            Alert.alert("Upload Failed", "Could not upload the document. Please try again.");
            return;
          }
          handleSendAttachment({
            type: "doc",
            driveUrl: res.url,
            title: doc.name || "Device_Document.pdf"
          });
        } catch (e) {
          console.warn("Doc upload error:", e);
          Alert.alert("Upload Failed", "Could not upload the document. Please try again.");
        }
      }
    } catch (e) {}
  }

  async function handleSendAttachment({ type, url, driveUrl, title }) {
    const isImage = type === "image";
    let mediaUrlVal = isImage ? (url || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80") : null;
    if (isImage && url && !/^(https?:\/\/|\/uploads\/)/i.test(url)) {
      try {
        const hosted = await uploadImageToServer(session?.token, url);
        if (hosted) mediaUrlVal = hosted;
      } catch (e) {}
    }
    const driveLinkVal = !isImage ? (driveUrl || "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view") : null;
    const fileNameVal = title || (isImage ? "Photo Attachment" : "Google Drive Document.pdf");
    const defaultText = isImage ? (title || "📷 Photo Attachment") : `📁 Google Drive Doc: ${fileNameVal}`;

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      authorId: currentUserId || "seed-user",
      authorName: session?.user?.name || "Learner",
      authorAvatar: session?.user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
      text: defaultText,
      mediaType: isImage ? "image" : "document",
      mediaUrl: mediaUrlVal,
      driveLink: driveLinkVal,
      fileName: fileNameVal,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      isSelf: true
    };

    setMessages((prev) => dedupeRoomMessages([...prev, newMsg]));
    setShowAttachModal(false);
    setPreviewImageUri(null);
    setPreviewImageTitle("");
    setImageCaptionInput("");
    setImageUrlInput("");
    setDriveLinkInput("");
    setDocTitleInput("");

    try {
      const res = await sendDoubtRoomMessage(session?.token, roomId, {
        text: defaultText,
        mediaType: isImage ? "image" : "document",
        mediaUrl: mediaUrlVal,
        driveLink: driveLinkVal,
        fileName: fileNameVal
      });
      if (res && res.room && res.room.messages) {
        setRoom(res.room);
        setMessages((prev) => dedupeRoomMessages([...prev, ...res.room.messages]));
      }
    } catch (err) {}
  }

  // Admin Management Modal State
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [editDescInput, setEditDescInput] = useState("");
  const [editAvatarInput, setEditAvatarInput] = useState("");

  const currentUserId = String(session?.user?._id || session?.user?.id || "");
  const isMember = Boolean((room?.members || []).includes(currentUserId) || room?.creatorId === currentUserId);
  const isAdmin = Boolean((room?.admins || []).includes(currentUserId) || room?.creatorId === currentUserId);
  const hasRequestedJoin = Boolean((room?.joinRequests || []).some((r) => String(r.userId) === currentUserId));

  async function handleJoinRoom() {
    try {
      setJoining(true);
      const token = session?.token;
      const res = await joinDoubtRoom(token, roomId);
      if (res && res.room) {
        setRoom(res.room);
        if (res.status === "requested") {
          Alert.alert("Request Sent", "Your request to join this Private Room has been sent to the Room Admin for approval.");
        } else {
          Alert.alert("Welcome", `You joined ${res.room.title}! You can now participate in discussions.`);
        }
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to join room.");
    } finally {
      setJoining(false);
    }
  }

  async function handleManageAction(action, extra = {}) {
    try {
      const token = session?.token;
      const res = await manageDoubtRoom(token, roomId, { action, ...extra });
      if (res && res.room) {
        setRoom(res.room);
        Alert.alert("Updated", "Room settings updated successfully!");
        setManageModalVisible(false);
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update room settings.");
    }
  }

  const scrollViewRef = useRef();

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates?.height || 0);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    loadRoomDetails();
    const interval = setInterval(() => {
      loadRoomDetails(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [roomId]);

  async function loadRoomDetails(silent = false) {
    try {
      if (!silent) setLoading(true);
      const token = session?.token;
      const res = await getDoubtRoomDetails(token, roomId);
      if (res && res.room) {
        setRoom(res.room);
        setMessages((prev) => {
          const serverMsgs = res.room.messages || [];
          return dedupeRoomMessages([...prev, ...serverMsgs]);
        });
      }
    } catch (err) {
      console.log("Error loading doubt room:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!inputText.trim()) return;
    try {
      setSending(true);
      const token = session?.token;
      const res = await sendDoubtRoomMessage(token, roomId, { text: inputText });
      if (res && res.room) {
        setRoom(res.room);
        setMessages((prev) => dedupeRoomMessages([...prev, ...(res.room.messages || [])]));
        setInputText("");
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleReaction(msgId, emoji) {
    try {
      const token = session?.token;
      const res = await sendDoubtRoomMessage(token, roomId, { replyToId: msgId, reactionEmoji: emoji });
      if (res && res.room) {
        setRoom(res.room);
        setMessages(res.room.messages || []);
      }
    } catch (e) {}
  }

  async function handleAskAi(doubtMessage) {
    try {
      setAiLoading(true);
      const questionText = doubtMessage?.text || doubtMessage?.codeSnippet || "Explain this doubt in detail.";

      let aiResponseText = "";
      try {
        const token = session?.token;
        const res = await askAiDoubt(token, roomId, {
          messageId: doubtMessage?.id,
          doubtText: questionText
        });
        if (res && res.aiMessage && res.aiMessage.text) {
          aiResponseText = res.aiMessage.text;
        } else if (res && res.room && Array.isArray(res.room.messages)) {
          setRoom(res.room);
          setMessages(res.room.messages);
          setAiLoading(false);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
          return;
        }
      } catch (backendErr) {
        console.warn("askAiDoubt API exception, switching to live Groq AI engine:", backendErr);
      }

      if (!aiResponseText) {
        aiResponseText = await generateDoubtAnswerWithLiveAI(questionText, room?.category || room?.subject);
      }

      const aiMsg = {
        id: `msg_ai_${Date.now()}`,
        authorName: "Phlappy AI Tutor 🤖",
        authorRole: "AI Assistant",
        authorAvatar: "https://api.thecodemunk.in/uploads/logo.png",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: aiResponseText,
        isAi: true,
        type: "ai_response"
      };

      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (err) {
      console.error("handleAskAi error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleVotePoll(pollId, optionId) {
    setMessages((prevMessages) => {
      return prevMessages.map((msg) => {
        const msgPollId = msg.pollId || msg.id;
        if (msg.type === "poll" && String(msgPollId) === String(pollId)) {
          const rawOptions = msg.options || [
            { id: "opt_1", text: "Yes, I want to learn again", count: 4, percentage: 80 },
            { id: "opt_2", text: "No, I understood", count: 1, percentage: 20 }
          ];

          const updatedOptions = rawOptions.map((opt) => {
            const isTarget = String(opt.id || opt.text) === String(optionId);
            const currentCount = opt.count || 0;
            const newCount = isTarget ? (opt.isVoted ? currentCount : currentCount + 1) : (opt.isVoted ? Math.max(0, currentCount - 1) : currentCount);
            return {
              ...opt,
              count: newCount,
              isVoted: isTarget
            };
          });

          const newTotalVotes = updatedOptions.reduce((sum, o) => sum + (o.count || 0), 0);
          const recalculateOptions = updatedOptions.map((opt) => ({
            ...opt,
            percentage: newTotalVotes > 0 ? Math.round(((opt.count || 0) / newTotalVotes) * 100) : 0
          }));

          return {
            ...msg,
            totalVotes: newTotalVotes,
            options: recalculateOptions
          };
        }
        return msg;
      });
    });

    try {
      const token = session?.token;
      if (token) {
        await voteDoubtRoomPoll(token, roomId, pollId, optionId);
      }
    } catch (err) {
      console.warn("Server poll vote skipped (client vote preserved):", err);
    }
  }

  function handleNotifyMentorForPoll(pollItem, votesCount) {
    const assignedMentor = room?.assignedMentor?.name
      ? room.assignedMentor
      : {
          id: "m1",
          name: room?.creatorName || "Rahul Sharma",
          role: "Senior Mentor",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120"
        };

    const questionText = pollItem?.question || "Who wants to learn this topic again in a live session?";
    const roomTitle = room?.title || room?.name || "Doubt Room";
    const prefilledMessage = `Hi ${assignedMentor.name}, in our doubt group '${roomTitle}', we have received ${votesCount} positive votes on the poll: "${questionText}". Can you please schedule a live solve session for us?`;

    if (onOpenMentorChat) {
      onOpenMentorChat(assignedMentor, prefilledMessage);
    } else if (onOpenMentorProfile) {
      onOpenMentorProfile(assignedMentor);
    } else {
      Alert.alert(
        "Mentor Alerted 📩",
        `Request sent to ${assignedMentor.name}!\n\nMessage: "${prefilledMessage}"`
      );
    }
  }

  async function handleCreatePoll() {
    if (!pollQuestion.trim()) return;
    const cleanQ = pollQuestion.trim();
    const newPollMsg = {
      id: `poll_${Date.now()}`,
      pollId: `poll_${Date.now()}`,
      type: "poll",
      authorName: session?.user?.name || "Student",
      authorRole: session?.user?.role || "Member",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      question: cleanQ,
      totalVotes: 4,
      options: [
        { id: "opt_1", text: "Yes, I want to learn again", count: 4, percentage: 80, isVoted: false },
        { id: "opt_2", text: "No, I understood concept", count: 1, percentage: 20, isVoted: false }
      ]
    };

    setMessages((prev) => [...prev, newPollMsg]);
    setPollModalVisible(false);
    setPollQuestion("");
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);

    try {
      const token = session?.token;
      if (token) {
        await createDoubtRoomPoll(token, roomId, {
          question: cleanQ,
          options: ["Yes, I want to learn again", "No, I understood concept"]
        });
      }
    } catch (err) {
      console.warn("Server poll create skipped (local poll created):", err);
    }
  }

  async function handleSendCodeSnippet() {
    if (!codeSnippetText.trim()) return;
    try {
      const token = session?.token;
      const res = await sendDoubtRoomMessage(token, roomId, { codeSnippet: codeSnippetText });
      if (res && res.room) {
        setRoom(res.room);
        setMessages(res.room.messages || []);
        setCodeSnippetText("");
        setCodeModalVisible(false);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to send code snippet.");
    }
  }

  async function handleMarkSolved() {
    try {
      const token = session?.token;
      const res = await markDoubtRoomSolved(token, roomId, {
        questionText: "Why does p-block element have lower electronegativity?",
        solutionText: "Atomic size increases down group & halogens have maximum effective nuclear pull."
      });
      if (res && res.success) {
        Alert.alert("Success 🎉", "Doubt thread marked as Solved and archived to TCM One Knowledge Base!");
        loadRoomDetails();
        setMenuVisible(false);
      }
    } catch (err) {
      Alert.alert("Error", "Could not mark as solved.");
    }
  }

  const assignedMentor = room?.assignedMentor || {
    id: "m1",
    name: "Rahul Sharma",
    role: "Chemistry Expert",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    online: true
  };

  if (showRoomDetails) {
    return (
      <RoomDetailsScreen
        session={session}
        room={room}
        isAdmin={isAdmin}
        onClose={() => setShowRoomDetails(false)}
        onRoomUpdated={(updatedRoom) => {
          if (!updatedRoom) {
            setShowRoomDetails(false);
            if (onClose) onClose();
          } else {
            setRoom(updatedRoom);
          }
        }}
      />
    );
  }

  const { theme } = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* 1. TOP HEADER MATCHING CHATSCREEN */}
      <View style={[styles.topHeader, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.isDark ? "#1E263B" : "#F1F5F9" }]} onPress={onClose}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={theme.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerUserCol} onPress={() => setShowRoomDetails(true)}>
          <View style={styles.avatarWrap}>
            {room?.roomAvatar ? (
              <Image source={{ uri: room.roomAvatar }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, { backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" }]}>
                <MaterialCommunityIcons name="code-tags" size={20} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.onlineDotHeader} />
          </View>

          <View style={styles.headerTextWrap}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>{room?.title || "Doubt Room"}</Text>
              {room?.isPrivate ? (
                <View style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#DC2626" }}>🔒 Private</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: theme.badgeBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: theme.primary }}>🌐 Public</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <View style={[styles.idBadge, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}>
                <Text style={[styles.idBadgeText, { color: theme.isDark ? "#C7D2FE" : "#5B3CF5" }]}>{room?.roomId || "DOUBT-ROOM"}</Text>
              </View>
              <Text style={[styles.headerStatus, { color: theme.subtext }]} numberOfLines={1}>
                {room?.membersCount || "1"} Member • <Text style={{ color: "#10B981" }}>🟢 Online</Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.isDark ? "#1E263B" : "#F0EDFF" }]} onPress={() => setShowRoomDetails(true)}>
            <MaterialCommunityIcons name="magnify" size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.isDark ? "#1E263B" : "#F0EDFF" }]} onPress={() => setMenuVisible(true)}>
            <MaterialCommunityIcons name="dots-vertical" size={18} color={theme.subtext} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {/* 2. PERMANENTLY PINNED ASSIGNED MENTOR CARD (ONLY IF CREATED BY MENTOR) */}
        {room?.assignedMentor?.name ? (
          <TouchableOpacity
            style={styles.assignedMentorCard}
            onPress={() => onOpenMentorProfile && onOpenMentorProfile(room.assignedMentor.id || "m1")}
            activeOpacity={0.85}
          >
            <View style={styles.mentorAvatarWrap}>
              {room.assignedMentor.avatarUrl && typeof room.assignedMentor.avatarUrl === "string" && room.assignedMentor.avatarUrl.trim().length > 5 ? (
                <Image source={{ uri: room.assignedMentor.avatarUrl }} style={styles.mentorAvatar} />
              ) : (
                <View style={[styles.mentorAvatar, { backgroundColor: "#5B3CF5", alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: "#FFFFFF" }}>
                    {(room.assignedMentor.name || "M").split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>

            <View style={styles.mentorInfo}>
              <Text style={styles.mentorLabel}>Assigned Mentor</Text>
              <Text style={styles.mentorName}>{room.assignedMentor.name}</Text>
              <Text style={styles.mentorSpecialty}>{room.assignedMentor.role || "TCM One Mentor"}</Text>
            </View>

            <MaterialCommunityIcons name="chevron-right" size={22} color="#64748B" />
          </TouchableOpacity>
        ) : null}

        {/* 3. PINNED ANNOUNCEMENT BANNER */}
        <View style={[styles.pinnedBanner, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.pinnedIconWrap}>
            <MaterialCommunityIcons name="pin" size={18} color={theme.primary} />
          </View>
          <View style={styles.pinnedTextWrap}>
            <Text style={[styles.pinnedAuthor, { color: theme.primary }]}>Pinned by Admin</Text>
            <Text style={[styles.pinnedText, { color: theme.text }]} numberOfLines={1}>{room?.pinnedAnnouncement?.text || "Please use this group only for NEET related doubts."}</Text>
          </View>
          <TouchableOpacity style={[styles.viewBannerBtn, { backgroundColor: theme.badgeBg, borderColor: theme.border }]} onPress={() => Alert.alert("Announcement", room?.pinnedAnnouncement?.text)}>
            <Text style={[styles.viewBannerText, { color: theme.primary }]}>View</Text>
          </TouchableOpacity>
        </View>

        {/* DATE DIVIDER */}
        <View style={styles.dateDivider}>
          <Text style={[styles.dateDividerText, { backgroundColor: theme.isDark ? "#1E263B" : "#F1F5F9", color: theme.subtext }]}>Today</Text>
        </View>

        {/* 4. CHAT MESSAGES LIST */}
        {loading ? (
          <ActivityIndicator size="large" color="#5B3CF5" style={{ marginVertical: 20 }} />
        ) : (
          messages.map((item, index) => {
            const uniqueKey = String(item.id || item._id || `msg_${index}`);

            if (item.type === "poll") {
              const option1Count = item.options && item.options[0] ? (item.options[0].count || 0) : 0;
              const totalPollVotes = item.totalVotes || item.options?.reduce((sum, o) => sum + (o.count || 0), 0) || 0;
              const positiveVotes = Math.max(option1Count, totalPollVotes);
              const isUnlocked = positiveVotes >= 5;

              return (
                <View key={uniqueKey} style={styles.pollCard}>
                  <View style={styles.pollHeader}>
                    <MaterialCommunityIcons name="poll" size={18} color="#5B3CF5" />
                    <Text style={styles.pollHeaderTitle}>Poll by {item.authorName}</Text>
                    {item.authorRole ? <View style={styles.adminTag}><Text style={styles.adminTagText}>{item.authorRole}</Text></View> : null}
                    <Text style={styles.pollTime}>{item.time}</Text>
                  </View>

                  <Text style={styles.pollQuestion}>{item.question}</Text>
                  <Text style={styles.pollSubText}>
                    {isUnlocked ? "✨ 5+ Positive Votes Received! Action Unlocked!" : `Select option (${positiveVotes}/5 positive votes to notify mentor)`}
                  </Text>

                  {item.options?.map((opt) => (
                    <TouchableOpacity
                      key={opt.id || opt.text}
                      style={[styles.pollOptionBox, opt.isVoted && styles.pollOptionBoxVoted]}
                      onPress={() => handleVotePoll(item.pollId || item.id, opt.id || opt.text)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pollOptionRow}>
                        <View style={[styles.radioCircle, opt.isVoted && styles.radioCircleSelected]}>
                          {opt.isVoted && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.pollOptionText, opt.isVoted && styles.pollOptionTextVoted]}>{opt.text}</Text>
                        <Text style={styles.pollPercentageText}>{opt.percentage || 0}% ({opt.count || 0})</Text>
                      </View>
                      {/* PROGRESS BAR */}
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${opt.percentage || 0}%` }]} />
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* UNLOCKED NOTIFY MENTOR ACTION BUTTON (5+ VOTES) */}
                  {isUnlocked ? (
                    <TouchableOpacity
                      style={[styles.notifyMentorUnlockedBtn, { backgroundColor: theme.isDark ? "#064E3B" : "#ECFDF5", borderColor: theme.isDark ? "#059669" : "#10B981" }]}
                      onPress={() => handleNotifyMentorForPoll(item, positiveVotes)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="bell-ring" size={16} color={theme.isDark ? "#34D399" : "#059669"} />
                      <Text style={[styles.notifyMentorUnlockedText, { color: theme.isDark ? "#34D399" : "#047857" }]}>
                        ✨ 5+ Positive Votes! Notify Mentor for Live Session 🚀
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.notifyMentorLockedBox, { backgroundColor: theme.isDark ? "#1E293B" : "#F8FAFC", borderColor: theme.border }]}>
                      <MaterialCommunityIcons name="lock-clock" size={14} color={theme.subtext} />
                      <Text style={[styles.notifyMentorLockedText, { color: theme.subtext }]}>
                        Reach 5 positive votes to unlock "Notify Mentor" ({positiveVotes}/5 Votes)
                      </Text>
                    </View>
                  )}

                  <View style={styles.pollFooter}>
                    <Text style={styles.pollMetaText}>{totalPollVotes} votes • Poll ends in {item.endsIn || "22h"}</Text>
                    <TouchableOpacity onPress={() => Alert.alert("Poll Details", `Total votes cast: ${totalPollVotes}\nPositive votes: ${positiveVotes}`)}>
                      <Text style={styles.viewPollText}>View Poll</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // CODE SNIPPET MESSAGE
            if (item.type === "code" || item.codeSnippet) {
              return (
                <View key={uniqueKey} style={styles.msgRowLeft}>
                  <Image source={{ uri: item.authorAvatar }} style={styles.msgAvatar} />
                  <View style={styles.msgBodyLeft}>
                    <Text style={styles.msgAuthor}>{item.authorName} <Text style={styles.msgTime}>{item.time}</Text></Text>
                    <CollapsibleCodeSnippet code={item.codeSnippet || item.text} />
                  </View>
                </View>
              );
            }

            const isImageMsg = item.mediaType === "image" || Boolean(item.mediaUrl) || (item.text || "").includes("Photo Attachment");
            const isDocMsg = item.mediaType === "document" || Boolean(item.driveLink) || (item.text || "").includes("Google Drive Doc");

            if (isImageMsg) {
              const imageUri = item.mediaUrl || (item.text?.startsWith("data:image/") || item.text?.startsWith("http") ? item.text : null) || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80";
              const captionText = (item.fileName || item.text || "").trim();
              const isDefaultLabel = !captionText || captionText.includes("Photo Attachment") || captionText.includes("Device Gallery Photo") || captionText.startsWith("data:image");

              return (
                <View key={uniqueKey} style={item.isSelf ? styles.msgRowRight : styles.msgRowLeft}>
                  {!item.isSelf && <Image source={{ uri: item.authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" }} style={styles.msgAvatar} />}
                  <View style={[item.isSelf ? [styles.msgBodyRight, { backgroundColor: theme.primary }] : [styles.msgBodyLeft, { backgroundColor: theme.cardBg, borderColor: theme.border }], { padding: 4 }]}>
                    {!item.isSelf && <Text style={styles.msgAuthor}>{item.authorName} <Text style={styles.msgTime}>{item.time}</Text></Text>}
                    <Pressable onPress={() => setFullImageModalUri(imageUri)}>
                      <Image source={{ uri: imageUri }} style={{ width: 220, height: 150, borderRadius: 12 }} resizeMode="cover" />
                    </Pressable>
                    {!isDefaultLabel ? (
                      <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: item.isSelf ? "#FFFFFF" : theme.text, marginTop: 4, paddingHorizontal: 6 }}>
                        {captionText}
                      </Text>
                    ) : null}
                    {item.isSelf && (
                      <View style={styles.metaRowRight}>
                        <Text style={styles.msgTimeRight}>{item.time}</Text>
                        <MaterialCommunityIcons name="check-all" size={14} color="#C4B5FD" style={{ marginLeft: 4 }} />
                      </View>
                    )}
                  </View>
                  {item.isSelf && <Image source={{ uri: item.authorAvatar || session?.user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" }} style={[styles.msgAvatar, { marginLeft: 8 }]} />}
                </View>
              );
            }

            if (isDocMsg) {
              const driveLinkVal = item.driveLink || "https://drive.google.com";
              return (
                <View key={uniqueKey} style={item.isSelf ? styles.msgRowRight : styles.msgRowLeft}>
                  {!item.isSelf && <Image source={{ uri: item.authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" }} style={styles.msgAvatar} />}
                  <View style={[item.isSelf ? styles.msgBodyRight : styles.msgBodyLeft, { padding: 8, minWidth: 230 }]}>
                    {!item.isSelf && <Text style={styles.msgAuthor}>{item.authorName} <Text style={styles.msgTime}>{item.time}</Text></Text>}
                    <Pressable
                      onPress={() => {
                        Linking.openURL(driveLinkVal).catch(() => Alert.alert("Doc Link", driveLinkVal));
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        backgroundColor: item.isSelf ? "rgba(255, 255, 255, 0.18)" : theme.badgeBg,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        width: "100%",
                        minWidth: 210
                      }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: item.isSelf ? "rgba(255,255,255,0.22)" : "#E8F5E9", alignItems: "center", justifyContent: "center" }}>
                        <MaterialCommunityIcons name="google-drive" size={22} color={item.isSelf ? "#FFFFFF" : "#0F9D58"} />
                      </View>
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: fonts.bold, color: item.isSelf ? "#FFFFFF" : theme.text }}>
                          {item.fileName || item.text.replace("📁 Google Drive Doc: ", "")}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: fonts.medium, color: item.isSelf ? "rgba(255,255,255,0.85)" : theme.subtext, marginTop: 1 }}>
                          Tap to open Document 📄
                        </Text>
                      </View>
                    </Pressable>
                    {item.isSelf && (
                      <View style={styles.metaRowRight}>
                        <Text style={styles.msgTimeRight}>{item.time}</Text>
                        <MaterialCommunityIcons name="check-all" size={14} color="#C4B5FD" style={{ marginLeft: 4 }} />
                      </View>
                    )}
                  </View>
                  {item.isSelf && <Image source={{ uri: item.authorAvatar || session?.user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" }} style={[styles.msgAvatar, { marginLeft: 8 }]} />}
                </View>
              );
            }

            // REGULAR CHAT BUBBLE (Self)
            if (item.isSelf) {
              return (
                <View key={uniqueKey} style={styles.msgRowRight}>
                  <View style={[styles.msgBodyRight, { backgroundColor: theme.primary }]}>
                    <Text style={styles.msgTextRight}>{item.text}</Text>
                    <View style={styles.metaRowRight}>
                      <Text style={styles.msgTimeRight}>{item.time}</Text>
                      <MaterialCommunityIcons name="check-all" size={14} color="#C4B5FD" style={{ marginLeft: 4 }} />
                    </View>

                    {/* ASK WITH AI BUTTON (RIGHT SIDE SELF MESSAGE) */}
                    {isQuestionMessage(item) && (
                      <TouchableOpacity
                        style={[styles.askAiBtn, { alignSelf: "flex-end", marginTop: 4, backgroundColor: theme.isDark ? "#1E1B4B" : "#E8F5E9", borderColor: theme.isDark ? "#312E81" : "#C8E6C9" }]}
                        onPress={() => handleAskAi(item)}
                        disabled={aiLoading}
                      >
                        <MaterialCommunityIcons name="sparkles" size={13} color={theme.isDark ? "#A78BFA" : "#6366F1"} />
                        <Text style={[styles.askAiText, { color: theme.isDark ? "#A78BFA" : "#0A6836" }]}>
                          {aiLoading ? "Asking AI..." : "Ask with AI"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Image source={{ uri: item.authorAvatar || session?.user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" }} style={[styles.msgAvatar, { marginLeft: 8 }]} />
                </View>
              );
            }

            // PARTICIPANT OR AI RESPONSE
            return (
              <View key={uniqueKey} style={styles.msgRowLeft}>
                <Image
                  source={
                    item.isAi || item.authorName?.includes("Phlappy")
                      ? phlappyLogo
                      : (item.authorAvatar && typeof item.authorAvatar === "string"
                          ? { uri: item.authorAvatar }
                          : (item.authorAvatar && typeof item.authorAvatar === "object"
                              ? item.authorAvatar
                              : { uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" }))
                  }
                  style={styles.msgAvatar}
                  resizeMode="contain"
                />
                <View style={styles.msgBodyLeft}>
                  <View style={styles.authorHeaderRow}>
                    <Text style={[styles.msgAuthor, { color: theme.text }]}>{item.authorName}</Text>
                    {item.isAdmin || item.authorRole === "Admin" ? (
                      <View style={[styles.adminTag, { backgroundColor: theme.isDark ? "#064E3B" : "#E8F5E9" }]}><Text style={[styles.adminTagText, { color: theme.isDark ? "#A7F3D0" : "#0A6836" }]}>Admin</Text></View>
                    ) : null}
                    {item.isAi ? (
                      <View style={[styles.aiTag, { backgroundColor: theme.isDark ? "#1E1B4B" : "#ECF9E9" }]}><Text style={[styles.aiTagText, { color: theme.isDark ? "#C7D2FE" : "#2E7D32" }]}>AI Assistant</Text></View>
                    ) : null}
                    <Text style={[styles.msgTime, { color: theme.subtext }]}>{item.time}</Text>
                  </View>

                  <CollapsibleMessageContainer item={item}>
                    {item.isAi ? (
                      renderAiFormattedResponse(item.text, theme)
                    ) : (
                      <Text style={[styles.msgTextLeft, { color: theme.text }, item.isAi && styles.msgTextAi]}>{item.text}</Text>
                    )}
                  </CollapsibleMessageContainer>

                  {/* SEPARATE PROFESSIONAL MENTION FOR AI BUBBLE BELOW THE BUBBLE */}
                  {item.isAi && (
                    <View style={styles.aiFooterMentionRow}>
                      <MaterialCommunityIcons name="shield-check" size={13} color={theme.isDark ? "#A78BFA" : "#6366F1"} />
                      <Text style={[styles.aiFooterMentionText, { color: theme.isDark ? "#A78BFA" : "#0A6836" }]}>
                        ⚡ Powered by Phlappy AI Engine • Verified Academic Tutor
                      </Text>
                    </View>
                  )}

                  {/* ASK WITH AI BUTTON (LEFT SIDE PARTICIPANT MESSAGE) */}
                  {isQuestionMessage(item) && (
                    <TouchableOpacity
                      style={[styles.askAiBtn, { backgroundColor: theme.isDark ? "#1E1B4B" : "#E8F5E9", borderColor: theme.isDark ? "#312E81" : "#C8E6C9" }]}
                      onPress={() => handleAskAi(item)}
                      disabled={aiLoading}
                    >
                      <MaterialCommunityIcons name="sparkles" size={13} color={theme.isDark ? "#A78BFA" : "#6366F1"} />
                      <Text style={[styles.askAiText, { color: theme.isDark ? "#A78BFA" : "#0A6836" }]}>
                        {aiLoading ? "Asking AI..." : "Ask with AI"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* CREATE POLL BUTTON */}
                  {item.canRequestMentorHelp && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <TouchableOpacity
                        style={[styles.mentorHelpBtn, { backgroundColor: theme.isDark ? "#1E1B4B" : "#F0EDFF", borderColor: theme.isDark ? "#312E81" : "#DDD6FE" }]}
                        onPress={() => setPollModalVisible(true)}
                      >
                        <MaterialCommunityIcons name="poll" size={16} color={theme.isDark ? "#C7D2FE" : "#5B3CF5"} />
                        <Text style={[styles.mentorHelpText, { color: theme.isDark ? "#C7D2FE" : "#5B3CF5" }]}>Create Poll</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 5. INPUT BAR OR JOIN ROOM BAR */}
      {!isMember ? (
        <View style={[styles.joinRoomContainer, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
          {hasRequestedJoin ? (
            <View style={[styles.joinRoomButton, { backgroundColor: "#64748B" }]}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.joinRoomButtonText}>Join Request Pending Approval</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.joinRoomButton, { backgroundColor: theme.primary }]} onPress={handleJoinRoom} disabled={joining}>
              {joining ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name={room?.isPrivate ? "lock-outline" : "account-plus"} size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.joinRoomButtonText}>
                    {room?.isPrivate ? "Request to Join Private Room" : "Join Room to Participate"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
          <TouchableOpacity style={[styles.plusBtn, { backgroundColor: theme.primary }]} onPress={() => setShowAttachModal(true)}>
            <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TextInput
            style={[styles.inputField, { backgroundColor: theme.inputBg || theme.bg, color: theme.text }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.subtext}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxHeight={100}
          />

          <TouchableOpacity style={styles.inputActionBtn} onPress={() => setCodeModalVisible(true)}>
            <MaterialCommunityIcons name="code-tags" size={22} color={theme.subtext} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.primary }]} onPress={handleSendMessage} disabled={sending}>
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL: OPTIONS & ADMIN MENU */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuContainer, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.menuHeaderTitle, { color: theme.text }]}>Doubt Room Options</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setShowRoomDetails(true); }}>
              <MaterialCommunityIcons name="information-outline" size={20} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Group Room Details & Settings</Text>
            </TouchableOpacity>

            {isAdmin ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setManageModalVisible(true); }}>
                  <MaterialCommunityIcons name="shield-account" size={20} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>
                    Admin Tools & Requests {(room?.joinRequests?.length || 0) > 0 ? `(${room.joinRequests.length} Pending)` : ""}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setPollModalVisible(true); }}>
              <MaterialCommunityIcons name="poll" size={20} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Create Live Poll</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setCodeModalVisible(true); }}>
              <MaterialCommunityIcons name="code-json" size={20} color="#3B82F6" />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Share Code Snippet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleMarkSolved}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#10B981" />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Mark Doubt as Solved</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: ADMIN MANAGEMENT TOOLS */}
      <Modal visible={manageModalVisible} transparent animationType="slide" onRequestClose={() => setManageModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.pollModalBox}>
            <Text style={styles.modalBoxTitle}>Room Admin Settings</Text>

            {/* PENDING JOIN REQUESTS SECTION */}
            {(room?.joinRequests || []).length > 0 ? (
              <View style={{ backgroundColor: "#FFFBEB", borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#FDE68A" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#D97706", marginBottom: 6 }}>
                  Pending Join Requests ({room.joinRequests.length})
                </Text>
                {room.joinRequests.map((reqItem, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, color: "#1E293B", fontWeight: "600" }}>
                      {reqItem.userName || "Student"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleManageAction("approve_request", { targetUserId: reqItem.userId })}
                        style={{ backgroundColor: "#10B981", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: 11, color: "#FFFFFF", fontWeight: "700" }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleManageAction("decline_request", { targetUserId: reqItem.userId })}
                        style={{ backgroundColor: "#EF4444", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: 11, color: "#FFFFFF", fontWeight: "700" }}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.modalBoxLabel}>Edit Room Description:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editDescInput}
              onChangeText={setEditDescInput}
              placeholder={room?.description || "Enter room description..."}
            />

            <TouchableOpacity
              style={[styles.submitModalBtn, { marginTop: 10, marginBottom: 16 }]}
              onPress={() => handleManageAction("update_info", { description: editDescInput })}
            >
              <Text style={styles.submitModalText}>Save Room Description</Text>
            </TouchableOpacity>

            <Text style={styles.modalBoxLabel}>Manage Room Members & Admins:</Text>
            <ScrollView style={{ maxHeight: 120, marginVertical: 6 }}>
              {(room?.members || [currentUserId]).map((mId, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                  <Text style={{ fontSize: 13, color: "#1E293B", fontWeight: "600" }}>
                    Member: {mId === currentUserId ? "You (Admin)" : `User_${String(mId).slice(-4)}`}
                  </Text>
                  {mId !== currentUserId ? (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleManageAction("promote_admin", { targetUserId: mId })}
                        style={{ backgroundColor: "#F0EDFF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: 11, color: "#5B3CF5", fontWeight: "700" }}>Make Admin</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleManageAction("remove_member", { targetUserId: mId })}
                        style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: 11, color: "#EF4444", fontWeight: "700" }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.cancelModalBtn, { marginTop: 12 }]} onPress={() => setManageModalVisible(false)}>
              <Text style={styles.cancelModalText}>Close Settings</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: CREATE POLL */}
      <Modal visible={pollModalVisible} transparent animationType="slide" onRequestClose={() => setPollModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.pollModalBox}>
            <Text style={styles.modalBoxTitle}>Create Live Poll</Text>
            <Text style={styles.modalBoxLabel}>Poll Question:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="e.g. Who wants a live revision session?"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setPollModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitModalBtn} onPress={handleCreatePoll}>
                <Text style={styles.submitModalText}>Publish Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: CODE SNIPPET */}
      <Modal visible={codeModalVisible} transparent animationType="slide" onRequestClose={() => setCodeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.pollModalBox}>
            <Text style={styles.modalBoxTitle}>Share Code Snippet</Text>
            <TextInput
              style={[styles.modalTextInput, { height: 120 }]}
              multiline
              value={codeSnippetText}
              onChangeText={setCodeSnippetText}
              placeholder="Paste code or derivation equations here..."
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setCodeModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitModalBtn} onPress={handleSendCodeSnippet}>
                <Text style={styles.submitModalText}>Send Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* MODAL: SHARE ATTACHMENT OPTIONS */}
      <Modal visible={showAttachModal} transparent animationType="slide" onRequestClose={() => setShowAttachModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="paperclip" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Share Attachment</Text>
              </View>
              <Pressable onPress={() => setShowAttachModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color={theme.subtext} />
              </Pressable>
            </View>

            {/* Type Selector Tabs */}
            <View style={styles.modalTabsRow}>
              <Pressable
                onPress={() => setAttachType("image")}
                style={[styles.modalTabBtn, attachType === "image" && { backgroundColor: theme.badgeBg, borderColor: theme.primary }]}
              >
                <Feather name="image" size={15} color={attachType === "image" ? theme.primary : theme.subtext} style={{ marginRight: 6 }} />
                <Text style={[styles.modalTabText, { color: attachType === "image" ? theme.primary : theme.subtext }]}>Photo / Image</Text>
              </Pressable>

              <Pressable
                onPress={() => setAttachType("doc")}
                style={[styles.modalTabBtn, attachType === "doc" && { backgroundColor: "#E8F5E9", borderColor: "#0F9D58" }]}
              >
                <MaterialCommunityIcons name="google-drive" size={16} color={attachType === "doc" ? "#0F9D58" : theme.subtext} style={{ marginRight: 6 }} />
                <Text style={[styles.modalTabText, { color: attachType === "doc" ? "#0F9D58" : theme.subtext }]}>Document File</Text>
              </Pressable>
            </View>

            {attachType === "image" ? (
              previewImageUri ? (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.previewHeaderRow}>
                    <Text style={[styles.previewTitle, { color: theme.text }]}>Photo Attachment Preview</Text>
                    <Pressable onPress={() => setPreviewImageUri(null)}>
                      <Feather name="x" size={16} color={theme.subtext} />
                    </Pressable>
                  </View>

                  <Image source={{ uri: previewImageUri }} style={{ width: "100%", height: 160, borderRadius: 12, marginVertical: 8 }} resizeMode="cover" />

                  <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: theme.text, marginTop: 6 }}>Add Caption / Message:</Text>
                  <TextInput
                    value={imageCaptionInput}
                    onChangeText={setImageCaptionInput}
                    placeholder="e.g. Check this doubt diagram..."
                    placeholderTextColor={theme.subtext}
                    style={{ backgroundColor: theme.inputBg || theme.bg, borderRadius: 10, padding: 10, color: theme.text, marginTop: 4, borderWidth: 1, borderColor: theme.border }}
                  />

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                    <Pressable onPress={() => setPreviewImageUri(null)} style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, color: theme.text }}>Change Photo</Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        handleSendAttachment({
                          type: "image",
                          url: previewImageUri,
                          title: imageCaptionInput || previewImageTitle || "Photo Attachment"
                        })
                      }
                      style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, backgroundColor: theme.primary }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: "#FFFFFF" }}>Send Photo Now</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  {/* Pick Photo Button */}
                  <Pressable onPress={pickImageFromDevice} style={{ backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="upload" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 13.5, fontFamily: fonts.bold, color: "#FFFFFF" }}>Pick & Upload Photo from Device 📁</Text>
                  </Pressable>

                  {/* Preset Samples */}
                  <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: theme.text, marginTop: 12, marginBottom: 6 }}>Sample Image Presets:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {sampleImagePresets.map((preset, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          setPreviewImageUri(preset.url);
                          setPreviewImageTitle(preset.label);
                        }}
                        style={{ backgroundColor: theme.badgeBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: theme.primary }}>{preset.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )
            ) : (
              <View style={{ marginTop: 12 }}>
                {/* Pick Document File Button */}
                <Pressable onPress={pickDocFromDevice} style={{ backgroundColor: "#0F9D58", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="file-upload-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13.5, fontFamily: fonts.bold, color: "#FFFFFF" }}>Pick & Upload Document File 📄</Text>
                </Pressable>

                {/* Sample Document Presets */}
                <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: theme.text, marginTop: 12, marginBottom: 6 }}>Sample Document Presets:</Text>
                <View style={{ gap: 8 }}>
                  {sampleDocPresets.map((docPreset, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() =>
                        handleSendAttachment({
                          type: "doc",
                          driveUrl: docPreset.driveUrl,
                          title: docPreset.title
                        })
                      }
                      style={{ backgroundColor: theme.cardBg, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <MaterialCommunityIcons name="file-pdf-box" size={20} color="#0F9D58" />
                        <Text style={{ fontSize: 12.5, fontFamily: fonts.medium, color: theme.text }}>{docPreset.label}</Text>
                      </View>
                      <Feather name="send" size={14} color={theme.primary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* QUICK ACTIONS ROW (POLL & CODE) */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Pressable
                onPress={() => {
                  setShowAttachModal(false);
                  setPollModalVisible(true);
                }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.badgeBg, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
              >
                <MaterialCommunityIcons name="poll" size={16} color={theme.primary} />
                <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: theme.primary }}>Create Poll</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowAttachModal(false);
                  setCodeModalVisible(true);
                }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
              >
                <MaterialCommunityIcons name="code-json" size={16} color="#2563EB" />
                <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: "#2563EB" }}>Share Code</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: FULL SCREEN IMAGE VIEW */}
      <Modal visible={Boolean(fullImageModalUri)} transparent animationType="fade" onRequestClose={() => setFullImageModalUri(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <Pressable onPress={() => setFullImageModalUri(null)} style={{ position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10 }}>
            <Feather name="x" size={26} color="#FFFFFF" />
          </Pressable>
          {fullImageModalUri ? (
            <Image source={{ uri: fullImageModalUri }} style={{ width: "90%", height: "70%", borderRadius: 12 }} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: Platform.OS === "web" ? "100vh" : "100%",
    maxHeight: Platform.OS === "web" ? "100vh" : "100%",
    backgroundColor: "#F8FAFC"
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F3FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  headerUserCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  avatarWrap: {
    position: "relative",
    marginRight: 10
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  onlineDotHeader: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 6,
    overflow: "hidden"
  },
  headerName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#181725",
    flexShrink: 1
  },
  headerStatus: {
    fontSize: 10.5,
    color: "#8A879F",
    flexShrink: 1
  },
  idBadge: {
    backgroundColor: "#F0EDFF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginRight: 6
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5B3CF5"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center"
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F4F3FA",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6
  },
  scrollBody: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 14,
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingTop: 8,
    paddingBottom: 8
  },
  assignedMentorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8
  },
  mentorAvatarWrap: {
    position: "relative",
    marginRight: 10
  },
  mentorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  mentorInfo: {
    flex: 1
  },
  mentorLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500"
  },
  mentorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A"
  },
  mentorSpecialty: {
    fontSize: 12,
    color: "#64748B"
  },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  pinnedIconWrap: {
    marginRight: 10
  },
  pinnedTextWrap: {
    flex: 1
  },
  pinnedAuthor: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5B3CF5"
  },
  pinnedText: {
    fontSize: 12,
    color: "#334155"
  },
  viewBannerBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  viewBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5B3CF5"
  },
  dateDivider: {
    alignItems: "center",
    marginVertical: 12
  },
  dateDividerText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  msgRowLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    width: "100%"
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 2
  },
  msgBodyLeft: {
    flex: 1,
    maxWidth: "84%"
  },
  authorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  msgAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginRight: 6
  },
  msgTime: {
    fontSize: 11,
    color: "#94A3B8"
  },
  adminTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 6
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0A6836"
  },
  aiTag: {
    backgroundColor: "#ECF9E9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 6
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E7D32"
  },
  bubbleLeft: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignSelf: "flex-start"
  },
  bubbleAi: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    maxWidth: "100%"
  },
  aiCodeContainer: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
    maxWidth: "100%"
  },
  aiCodeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  aiCodeLangText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5B3CF5",
    letterSpacing: 0.5
  },
  aiCodeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#0F172A",
    padding: 10,
    lineHeight: 18
  },
  msgTextLeft: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20
  },
  msgTextAi: {
    color: "#166534"
  },
  askAiBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4
  },
  askAiText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0A6836",
    marginLeft: 4
  },
  aiFooterMentionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 4
  },
  aiFooterMentionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0A6836",
    marginLeft: 4
  },
  mentorHelpBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 6
  },
  mentorHelpText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 4
  },
  notifyMentorUnlockedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5
  },
  notifyMentorUnlockedText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    textAlign: "center"
  },
  notifyMentorLockedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed"
  },
  notifyMentorLockedText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    textAlign: "center"
  },
  reactionsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  reactionBadge: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6
  },
  reactionText: {
    fontSize: 12,
    color: "#334155"
  },
  addReactionBtn: {
    padding: 4,
    marginRight: 4
  },
  msgRowRight: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginBottom: 14,
    width: "100%"
  },
  msgBodyRight: {
    backgroundColor: "#0A6836",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "82%",
    alignSelf: "flex-end"
  },
  msgTextRight: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20
  },
  metaRowRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4
  },
  msgTimeRight: {
    fontSize: 11,
    color: "#DDD6FE"
  },
  reactionsRowRight: {
    flexDirection: "row",
    marginTop: 4
  },
  pollCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16
  },
  pollHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  pollHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B3CF5",
    marginLeft: 6,
    marginRight: 6
  },
  pollTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginLeft: "auto"
  },
  pollQuestion: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2
  },
  pollSubText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12
  },
  pollOptionBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8
  },
  pollOptionBoxVoted: {
    borderColor: "#5B3CF5",
    backgroundColor: "#F0EDFF"
  },
  pollOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8
  },
  radioCircleSelected: {
    backgroundColor: "#5B3CF5",
    borderColor: "#5B3CF5"
  },
  pollOptionText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    fontWeight: "500"
  },
  pollOptionTextVoted: {
    fontWeight: "700",
    color: "#5B3CF5"
  },
  pollPercentageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B"
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#5B3CF5",
    borderRadius: 3
  },
  pollFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  pollMetaText: {
    fontSize: 12,
    color: "#64748B"
  },
  viewPollText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B3CF5"
  },
  codeSnippetBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: 180,
    overflow: "hidden"
  },
  codeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4
  },
  codeLangText: {
    fontSize: 11,
    color: "#5B3CF5",
    fontWeight: "700"
  },
  copyCodeText: {
    fontSize: 11,
    color: "#6366F1",
    fontWeight: "600"
  },
  codeContentText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12.5,
    color: "#0F172A",
    lineHeight: 18
  },
  joinRoomContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center"
  },
  joinRoomButton: {
    backgroundColor: "#5B3CF5",
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  joinRoomButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingBottom: Platform.OS === "ios" ? 14 : 10
  },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#5B3CF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 2
  },
  inputField: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    fontSize: 14,
    color: "#0F172A",
    maxHeight: 100
  },
  inputActionBtn: {
    padding: 6,
    marginLeft: 4,
    marginBottom: 2
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#5B3CF5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    marginBottom: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end"
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20
  },
  menuHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 12
  },
  pollModalBox: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: "auto",
    marginTop: "auto"
  },
  modalBoxTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12
  },
  modalBoxLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6
  },
  modalTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 16
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8
  },
  cancelModalText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600"
  },
  submitModalBtn: {
    backgroundColor: "#5B3CF5",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12
  },
  submitModalText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700"
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%"
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  modalCloseBtn: {
    padding: 6
  },
  modalTabsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  modalTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC"
  },
  modalTabText: {
    fontSize: 12.5,
    fontWeight: "600"
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700"
  }
});
