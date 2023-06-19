import "./displaySpecificPost.css"
import {MoreVert,Share,Edit,Save,Delete,FavoriteBorderRounded,FavoriteRounded,ChatBubbleOutlineRounded} from "@material-ui/icons"
import { useEffect,useState,useRef,forwardRef } from "react";
import axios from "axios";
import {format} from "timeago.js"
import {Link} from "react-router-dom"
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Modal, useMantineTheme } from "@mantine/core";
import Comment from "../../components/comment/Comment";
import Rightbar from "../../components/rightbar/Rightbar";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import {useParams} from "react-router"
import {io} from "socket.io-client"
import { useNavigate } from "react-router-dom";



export default function DisplaySpecificPost() {
  const [socket, setSocket] = useState(null);
    const postId = useParams().userPost;
    const [post,setPost] = useState('');
    const [user,setUser] = useState({});
    const [like,setLike] = useState(post?.likes?.length);
    const [comments,setComments] = useState(post?.comments);
    const [editMode, setEditMode] = useState(false);
    const postDesc = useRef(post?.desc);
    const {dispatch} = useContext(AuthContext);
    const [isLiked,setIsLiked] = useState(false);
    const PF = process.env.REACT_APP_PUBLIC_FOLDER;
    const {user: currentUser} = useContext(AuthContext);
    const [openPopup, setOpenPopup] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(true);
    const pattern = /@(\w+)/g;
    const [replacedText,setReplacedText] = useState(post?.desc?.replace(pattern, '<a href="/profile/$1">$1</a>'));
    const ClickOutsideRef = useRef(null);
    const comment = useRef();
    const [postOpenPopup, setPostOpenPopup] = useState(true);
    const theme = useMantineTheme();
    const [isDeletePostClicked, setIsDeletePostClicked] = useState(false);
    const navigate = useNavigate();
    const {organization} = useContext(AuthContext);
    const [isQuestion, setIsQuestion] = useState(false); // State to track if the post is a question
    const [timeLeft, setTimeLeft] = useState(0); // State to track the time left in seconds
    const [timeLeftForVoting, setTimeLeftForVoting] = useState(0); // State to track the time left in seconds
    const [discussionTime, setDiscussionTime] = useState(1 * 90 * 1000); // State to track the time left in seconds
    const [votingTime, setVotingTime] = useState(2 * 90 * 1000); // State to track the time left in seconds
    const [repeatedDecision, setRepeatedDecision] = useState(post?.repeatedDecision);


    useEffect(()=>{
      setSocket(io("ws://localhost:8900"));
      socket?.emit("addUser", currentUser?._id);
  
      },[]);

      useEffect(() => {
        setComments(post.comments);
      }, [post]);

      useEffect(() => {
          if (post.type === 'question') {
            setIsQuestion(true);
            startTimer();
          }
        }, [post,timeLeft,timeLeftForVoting]);

        useEffect(() => {
          if (repeatedDecision) {
            setIsQuestion(true);
            startTimer();
          }
        }, [repeatedDecision,timeLeft,timeLeftForVoting]);

        const updateUserScore = async() =>{
          const scoreRes = await axios.get(`/users/${organization._id}/${currentUser._id}/score`);
          dispatch({ type: "UPDATED_USER_SCORE", payload: scoreRes.data });
        }

        const updateSecondTimer = async() =>{
          setRepeatedDecision(true);
        }

        useEffect(()=>{
          socket?.on("getUpdatedUserScore", data=>{
            updateUserScore();
                        })
    },[user?._id,socket,post]);

    useEffect(()=>{
      socket?.on("renderSecondTimer", data=>{
        updateSecondTimer();
                    })
  },[user?._id,socket,post]);    
      
  const startTimer = () => {
    const createTime = new Date(post.createdAt).getTime();
    let oneHourLater,twoHourLater;
    if(!repeatedDecision)
    {
      oneHourLater = createTime + discussionTime; // Add one hour in milliseconds
      twoHourLater = createTime + votingTime; // Add one hour in milliseconds
    }
    else
    {
      twoHourLater = createTime + votingTime + discussionTime; // Add one hour in milliseconds
      oneHourLater = 0; // Add one hour in milliseconds
    }
    const currentTime = new Date().getTime();
    let timeDiff = oneHourLater - currentTime;
    const votingStartTime = twoHourLater - currentTime; // Calculate the start time of the voting timer
    
    // Reset the timer after one hour
    if (timeDiff < 0) {
      setTimeLeft(0); // Set the time left to zero if it's negative
  } else {
        setTimeLeft(Math.ceil(timeDiff / 1000)); // Convert milliseconds to seconds and round up
      }

    if (votingStartTime > 0 && timeDiff <=0 ) {
     setTimeLeftForVoting(Math.ceil(votingStartTime / 1000))
    } else {
      setTimeLeftForVoting(0);
    }
  };
        useEffect(() => {
          const votingTimerInterval = setInterval(() => {
            setTimeLeftForVoting((prevTimeLeftForVoting) => {
              if (prevTimeLeftForVoting <= 0) {
                clearInterval(votingTimerInterval);
                return 0;
              } else {
                return prevTimeLeftForVoting - 1;
              }
            });
          }, 1000); // Update the interval timing to 1000ms (1 second)
        
          return () => {
            clearInterval(votingTimerInterval);
          };
        }, [timeLeftForVoting]); 
        

        useEffect(() => {
          const timerInterval = setInterval(() => {
            setTimeLeft((prevTimeLeft) => {
              if (prevTimeLeft <= 0) {
                clearInterval(timerInterval);
                return 0;
              } else {
                return prevTimeLeft - 1;
              }
            });
          }, 1000);
      
          return () => {
            clearInterval(timerInterval);
          };
        }, [timeLeft]);
      
        const formatTime = (time) => {
          const minutes = Math.floor(time / 60).toString().padStart(2, '0');
          const seconds = (time % 60).toString().padStart(2, '0');
          return `${minutes}:${seconds}`;
        };

      
    useEffect(() => {
      const fetchPost = async () => {
        const res = await axios.get(`/posts/${postId}`);
        setPost(res.data);
        setLike(res.data?.likes.length);
        setComments(res.data?.comments);
        setReplacedText(res.data.desc?.replace(pattern, '<a href="/profile/$1">$1</a>'))
      };
      fetchPost();
    }, [postId]);

    useEffect (() =>{
      const fetchUser = async () => {
        const res = await axios.get(`/users/${organization._id}?userId=${post?.userId}`);
        setUser(res.data);
      };
    
      if(post?.userId !== undefined)
        fetchUser();
    },[post?.userId]);

    useEffect(() => {

        function handleClickOutside(event) {
         
          
           if(!ClickOutsideRef.current?.contains(event.target) && editMode)
                setEditMode(!editMode)
            if(!ClickOutsideRef.current?.contains(event.target) && openPopup)
                setOpenPopup(!openPopup)     
          if(openPopup && editMode)
                setOpenPopup(false);
            
        }
            
              document.addEventListener("click", handleClickOutside);
              return () => {
                document.removeEventListener("click", handleClickOutside);
              };
            }, [ClickOutsideRef,openPopup,editMode,Modal]);
    
    
    useEffect (() =>{
       setIsLiked(post?.likes?.includes(currentUser._id))
        },[currentUser._id,post?.likes,postId]);

    

      

        const likeHandler= async() => {
          const updateLikeNotification ={
            operation: "like",
            senderId: currentUser._id,
            post: post
        }
          try{
            await axios.put("/posts/" + post._id + "/like", {userId:currentUser._id })
         
          }catch(err){
              console.log(err);
          }
          if(!isLiked && post.userId !== currentUser._id)
          {
              socket.emit("sendLikesNotifications",{
                  senderId:currentUser._id,
                  recieverId:user._id,
                  post:post,
                  operation:"like"
          })
          await axios.put("/users/"+ organization._id + "/" + user._id + "/NewPostNotify",updateLikeNotification);   
        }
          setLike(isLiked ? like -1 : like + 1);
          setIsLiked(!isLiked);
      }

    const handleEdit = async (e) => {
        e.preventDefault();
        const updatedPost = {
            userId: post?.userId,
            desc: postDesc.current.value,
        };
        try {
          await axios.put(`/posts/${post?._id}`, updatedPost);
          setEditMode(false);
        } catch (err) {
          console.log(err);
        }
        window.location.reload();

      }

      const handleDeleteConfirm = async (e) => {
        e.preventDefault();
            try {
                await axios.delete(`/posts/${post?._id}`);
                setEditMode(false);
              } catch (err) {
                console.log(err);
              }
              window.location.reload();
      
            }
    
        
      const handlePopUp = (e) => {
        setEditMode(!editMode);

      }

      

      const submitHandler = async (e) =>{
        e.preventDefault();
        const newComment = {
          userId: currentUser._id,
          text: comment.current.value,
          postId: post._id
      };

      const updateCommentNotification ={
        operation: "comment",
        senderId: currentUser._id,
        post: post
    }
    try
    {
      const res= await axios.post(`/posts/${post._id}/comment`, newComment);
      const commentId = res.data._id; 
      const comments =  await axios.get(`/posts/${post._id}/allComments`);
      setComments(comments.data);

      if(post.userId !== currentUser._id)
      {
          socket.emit("sendCommentsNotifications",{
              senderId:currentUser._id,
              recieverId:user._id,
              post:post,
              operation:"comment"
          })
          
          await axios.put("/users/" + organization._id +"/" + user._id + "/NewPostNotify",updateCommentNotification);
      }
      socket.emit("sendComment",{
        commentId
    })
  }
        catch(err)
        {
          console.log(err);
        }
        comment.current.value='';
      }

  return(
    <>
    
    <Topbar/>
    <div className="displayPost">
    <Sidebar/>
    <div className="postRightBottom">
          <Rightbar />
        </div>  
    <Modal 
     styles={{
        modal: {
            backgroundColor: theme.colors.gray[1],
          boxShadow: "none",
          borderRadius: 0,
          border: "none",
        },
       
      }}
    overlayOpacity={0.55}
    size={"40%"}
    overlayBlur={3}
    opened={postOpenPopup}
    onClose={() => navigate("/")}
  >
            <div className="postWrapper">
                
                <div className="postTop">
    
    
                <Link to= {`/profile/${user.firstName}` }style={{ textDecoration: "none", color: "black" }}>
                    <div className="postTopLeft">
                       
                        <img 
                            className="postProfileImg" 
                            src={ user.profilePicture ? PF + user.profilePicture : PF+"person/noAvatar.png"}
                            alt =""
                        />
                        <span
                         className="postUsername">
                            {user.firstName} {user.lastName }
                        </span>
                       
                       
                    </div>
                    </Link>
                    <div className="postTopRight" >
                    <span className="postDate">{format(post?.createdAt)}</span>
                    <span className="postT"> {post?.type}</span>
    
                        {currentUser._id === post?.userId &&
                            <MoreVert className="moreVertIcon" onClick={() => setOpenPopup(!openPopup)}/>
                        }
    
                        <div className="popWrapper" >
                {openPopup &&(
                    <div className="postOptionsPopup">
                        <div className="popUpItem" onClick={ handlePopUp}>
                        <Edit className="popItemIcon"/>
                        <span className="textButton">Edit
                        </span>
                        </div>
                            <div className="popUpItem"onClick={ ()=>setIsDeletePostClicked(!isDeletePostClicked)}>
                            <Delete className="popItemIcon"/>
                        <span className="textButton">
                            Delete</span>
                            </div>
                            <Modal  styles={{
            modal: {
                backgroundColor: theme.colors.gray[1],
              boxShadow: "none",
              borderRadius: 0,
              border: "none",
            },
           
          }}
    overlayOpacity={0.55}
    overlayBlur={3}
     opened={isDeletePostClicked} onClose={() => setIsDeletePostClicked(false)}
>
        <h2>Are you sure you want to delete the post?</h2>
        <div className="buttonsModalFrame">
        <button className="modalButton" onClick={()=> setIsDeletePostClicked(false)}>Cancel</button>
        <button className="modalButton" onClick={handleDeleteConfirm}>Delete</button>
        </div>
      </Modal>
                       </div>
                )}
                    </div>
    
                </div>
                
            </div>
            <div className="">
            {(post?.startEventDate &&  !post?.endEventDate) &&
            <span className="eventDate">
            <p>Date: {new Date(post?.startEventDate).toLocaleDateString('en-GB')}</p>
              </span>           
            }
            {(post?.startEventDate &&  post?.endEventDate) &&
            <span className="eventDate">
            <p>Date: {new Date(post?.startEventDate).toLocaleDateString('en-GB')} - {new Date(post.endEventDate).toLocaleDateString('en-GB')}</p>
              </span>           
            }
            {isQuestion && timeLeft !== 0 && (
          <div className="timerContainer">
            <span className="timer">Discuss: {formatTime(timeLeft)}</span>
          </div>
        )}
        {isQuestion && timeLeft === 0 && timeLeftForVoting !== 0 &&(
          <div className="timerContainer">
            <span className="timer">Voting: {formatTime(timeLeftForVoting)}</span>
          </div>
        )}
                </div>
                <div className="postCenter">
                    {editMode && (
                        <>
                            <textarea
                     defaultValue ={post?.desc}
                     className="postInput"
                     ref ={postDesc}/>
                     <button className="saveButton" onClick={handleEdit}>
                        Comment
                     </button>
                     </>
    
    
                    )}
                    { !editMode && (
                         <div className="postCenter">
                        <div className="postText" dangerouslySetInnerHTML={{ __html: replacedText }}/>
                        <img className="postImg" src={post?.img ? PF+post?.img : ""} alt=""/>
                        </div>
                    )}
                    
                </div>
                <div className="postBottom">
                    <div className="postBottomLeft">
                        {isLiked ? (
                        <><FavoriteRounded htmlColor="red" onClick={()=>likeHandler()} alt="" className="likeIcon" />
                        </>
                        ): (
                            <>
                             <FavoriteBorderRounded onClick={()=>likeHandler()}  alt="" className="likeIcon" />
                            
                            </>
                            )
                        }
                            <ChatBubbleOutlineRounded   alt="" className="commentIcon" />
                        <span className="postLikeCounter">{like} people like it</span>
    
                    </div>
                    <div className="postBottomRight"onClick={(e)=> setCommentsOpen(!commentsOpen)}>
                        <span className="postCommentText">{comments?.length} comments</span>
    
                    </div>
                   
                </div> 
                
                <>
                {commentsOpen &&(
                    <div className="wrapper">{comments?.map(c=>(
                        <div>
                        {user !== "" &&(
                        <Comment comment={c} post ={post} timeLeft = {timeLeftForVoting}></Comment>
                        )
                    }
                    </div>
                  
                   
                    ))}
                             </div>
                )}
                   
                   {isQuestion ? (
                        timeLeft > 0 ? (
                          <form className="postCommentBottom" onSubmit={submitHandler}>
                            <div className="comments">
                              <div className="containerComments">
                                <img className="profileImg" src={currentUser.profilePicture ? PF + currentUser.profilePicture : PF + "person/noAvatar.png"} alt=""/>
                                <textarea className="commentInput" type="text" placeholder="Write a comment" ref={comment} />
                                <button className="commentBtn" type="submit">Comment</button>
                              </div>
                            </div>
                          </form>
                        ) : (
                          <div className="postCommentBottom">
                          <p className="commentPeriodEnded">The discussion for this question is over.</p>
                          </div>
                        )
                      ) : (
                        <form className="postCommentBottom" onSubmit={submitHandler}>
                          <div className="comments">
                            <div className="containerComments">
                              <img className="profileImg" src={currentUser.profilePicture ? PF + currentUser.profilePicture : PF + "person/noAvatar.png"} alt=""/>
                              <textarea className="commentInput" type="text" placeholder="Write a comment" ref={comment} />
                              <button className="commentBtn" type="submit">Comment</button>
                            </div>
                          </div>
                        </form>
                      )}
                      </>
            </div>
              
    </Modal>
    
    <div className="postRightBottom">
          <Rightbar />
        </div>
    </div>
    </>
      )
}
